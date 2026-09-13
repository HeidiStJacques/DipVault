import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../constants/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const GOOGLE_WEB_CLIENT_ID =
  '250963743906-3lfpgftttn9e822jv779v5qckonf01pq.apps.googleusercontent.com';
  
export default function SignupScreen() {
  const { setToken } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  useEffect(() => {
    const checkAppleAvailability = async () => {
      if (Platform.OS !== 'ios') {
        setAppleAvailable(false);
        return;
      }

      try {
        const available =
          await AppleAuthentication.isAvailableAsync();

        setAppleAvailable(available);
      } catch {
        setAppleAvailable(false);
      }
    };

    checkAppleAvailability();
  }, []);

  const handleSignup = async () => {
    setError('');

    if (
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.'
      );
      return;
    }

    try {
      setLoading(true);

      // Create account
      const registerRes = await fetch(
        `${API_BASE}/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const registerData =
        await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(
          registerData.detail ||
            'Registration failed.'
        );
      }

      // Log in immediately after signup
      const loginRes = await fetch(
        `${API_BASE}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const loginData =
        await loginRes.json();

      if (!loginRes.ok) {
        throw new Error(
          loginData.detail ||
            'Login after signup failed.'
        );
      }

      if (!loginData.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(
        loginData.access_token
      );

      router.replace('/(app)/home');
    } catch (err: any) {
      setError(
        err?.message ||
          'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');

    try {
      setGoogleLoading(true);

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const result =
        await GoogleSignin.signIn();

      const resultAny = result as any;

      const idToken =
        resultAny?.data?.idToken ??
        resultAny?.idToken ??
        null;

      if (!idToken) {
        throw new Error(
          'Google did not return an ID token.'
        );
      }

      const res = await fetch(
        `${API_BASE}/auth/google`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_token: idToken,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail ||
            'Google sign-up failed.'
        );
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(
        data.access_token
      );

      router.replace('/(app)/home');
    } catch (err: any) {
      if (
        err?.code ===
        statusCodes.SIGN_IN_CANCELLED
      ) {
        return;
      }

      if (
        err?.code ===
        statusCodes.IN_PROGRESS
      ) {
        return;
      }

      if (
        err?.code ===
        statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setError(
          'Google Play Services are not available on this device.'
        );
        return;
      }

      setError(
        err?.message ||
          'Unable to continue with Google.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    setError('');

    try {
      setAppleLoading(true);

      const credential =
        await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication
              .AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication
              .AppleAuthenticationScope.EMAIL,
          ],
        });

      if (!credential.identityToken) {
        throw new Error(
          'Apple did not return an identity token.'
        );
      }

      const res = await fetch(
        `${API_BASE}/auth/apple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identity_token:
              credential.identityToken,

            email:
              credential.email || null,

            first_name:
              credential.fullName?.givenName ||
              null,

            last_name:
              credential.fullName?.familyName ||
              null,

            apple_user_id:
              credential.user,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail ||
            'Apple sign-up failed.'
        );
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(
        data.access_token
      );

      router.replace('/(app)/home');
    } catch (err: any) {
      if (
        err?.code ===
        'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      setError(
        err?.message ||
          'Unable to continue with Apple.'
      );
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.container
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.wordmark}>
              DipVault
            </Text>

            <Text style={styles.tagline}>
              Create your account
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Sign Up
            </Text>

            {error ? (
              <Text style={styles.error}>
                {error}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={
                COLORS.textSecondary
              }
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={
                COLORS.textSecondary
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={
                COLORS.textSecondary
              }
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />

            <TouchableOpacity
              style={[
                styles.button,
                (loading ||
                  googleLoading ||
                  appleLoading) &&
                  styles.disabledButton,
              ]}
              onPress={handleSignup}
              disabled={
                loading ||
                googleLoading ||
                appleLoading
              }
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
                  Create Account
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                OR
              </Text>

              <View style={styles.divider} />
            </View>

            <View
              style={
                styles.socialButtonContainer
              }
            >
              {googleLoading ? (
                <View
                  style={
                    styles.loadingSocialButton
                  }
                >
                  <ActivityIndicator />

                  <Text
                    style={
                      styles.loadingSocialText
                    }
                  >
                    Continuing with Google...
                  </Text>
                </View>
              ) : (
                <GoogleSigninButton
                  size={
                    GoogleSigninButton.Size.Wide
                  }
                  color={
                    GoogleSigninButton.Color.Light
                  }
                  onPress={
                    handleGoogleSignup
                  }
                  disabled={
                    loading ||
                    appleLoading
                  }
                  style={
                    styles.googleButton
                  }
                />
              )}
            </View>

            {appleAvailable ? (
              <View
                style={
                  styles.socialButtonContainer
                }
              >
                {appleLoading ? (
                  <View
                    style={
                      styles.loadingAppleButton
                    }
                  >
                    <ActivityIndicator
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.loadingAppleText
                      }
                    >
                      Continuing with Apple...
                    </Text>
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication
                        .AppleAuthenticationButtonType
                        .CONTINUE
                    }
                    buttonStyle={
                      AppleAuthentication
                        .AppleAuthenticationButtonStyle
                        .BLACK
                    }
                    cornerRadius={
                      RADIUS.md
                    }
                    onPress={
                      handleAppleSignup
                    }
                    style={
                      styles.appleButton
                    }
                  />
                )}
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() =>
                router.back()
              }
              disabled={
                loading ||
                googleLoading ||
                appleLoading
              }
            >
              <Text style={styles.link}>
                Already have an account?{' '}
                <Text
                  style={
                    styles.linkAccent
                  }
                >
                  Sign in
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 36,
  },

  wordmark: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: -1,
  },

  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.medium,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },

  error: {
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 12,
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
  },

  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  socialButtonContainer: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },

  googleButton: {
    width: '100%',
    height: 48,
  },

  appleButton: {
    width: '100%',
    height: 48,
  },

  loadingSocialButton: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingSocialText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  loadingAppleButton: {
    width: '100%',
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  loadingAppleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  link: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },

  linkAccent: {
    color: COLORS.accent,
    fontWeight: '600',
  },
});
