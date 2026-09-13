import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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

// ============================================================
// LOGIN SCREEN
// ============================================================

export default function LoginScreen() {
  const { setToken } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const [appleAvailable, setAppleAvailable] = useState(false);

  // ==========================================================
  // GOOGLE SIGN-IN SETUP
  // ==========================================================

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
  }, []);

  // ==========================================================
  // APPLE SIGN-IN AVAILABILITY
  // ==========================================================

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

  // ==========================================================
  // EMAIL / PASSWORD LOGIN
  // ==========================================================

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Login failed.');
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(data.access_token);

      router.replace('/(app)/home');
    } catch (err: any) {
      setError(
        err?.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // GOOGLE SIGN-IN
  // ==========================================================

  const handleGoogleLogin = async () => {
    setError('');

    try {
      setGoogleLoading(true);

      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const result = await GoogleSignin.signIn();

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

      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || 'Google sign-in failed.'
        );
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(data.access_token);

      router.replace('/(app)/home');
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (err?.code === statusCodes.IN_PROGRESS) {
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
          'Unable to sign in with Google.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  // ==========================================================
  // APPLE SIGN-IN
  // ==========================================================

  const handleAppleLogin = async () => {
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

      const res = await fetch(`${API_BASE}/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity_token: credential.identityToken,

          email: credential.email || null,

          first_name:
            credential.fullName?.givenName || null,

          last_name:
            credential.fullName?.familyName || null,

          apple_user_id: credential.user,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || 'Apple sign-in failed.'
        );
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      await setToken(data.access_token);

      router.replace('/(app)/home');
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      setError(
        err?.message ||
          'Unable to sign in with Apple.'
      );
    } finally {
      setAppleLoading(false);
    }
  };

  // ==========================================================
  // SCREEN
  // ==========================================================

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
        <View style={styles.container}>
          
          {/* HEADER */}

          <View style={styles.header}>
            <Text style={styles.wordmark}>
              DipVault
            </Text>

            <Text style={styles.tagline}>
              Your personal dip collection
            </Text>
          </View>

          {/* LOGIN CARD */}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Sign In
            </Text>

            {error ? (
              <Text style={styles.error}>
                {error}
              </Text>
            ) : null}

            {/* EMAIL */}

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

            {/* PASSWORD */}

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
              textContentType="password"
            />

            {/* EMAIL/PASSWORD SIGN IN */}

            <Pressable
              onPress={handleLogin}
              disabled={
                loading ||
                googleLoading ||
                appleLoading
              }
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading ||
                  googleLoading ||
                  appleLoading) &&
                  styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text style={styles.buttonText}>
                  Sign In
                </Text>
              )}
            </Pressable>

            {/* DIVIDER */}

            <View style={styles.dividerRow}>
              <View style={styles.divider} />

              <Text style={styles.dividerText}>
                OR
              </Text>

              <View style={styles.divider} />
            </View>

            {/* GOOGLE SIGN IN */}

            <View
              style={styles.socialButtonContainer}
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
                    Signing in with Google...
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
                  onPress={handleGoogleLogin}
                  disabled={
                    loading || appleLoading
                  }
                  style={styles.googleButton}
                />
              )}
            </View>

            {/* APPLE SIGN IN */}

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
                      Signing in with Apple...
                    </Text>
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication
                        .AppleAuthenticationButtonType
                        .SIGN_IN
                    }
                    buttonStyle={
                      AppleAuthentication
                        .AppleAuthenticationButtonStyle
                        .BLACK
                    }
                    cornerRadius={RADIUS.md}
                    onPress={handleAppleLogin}
                    style={styles.appleButton}
                  />
                )}
              </View>
            ) : null}

            {/* SIGN UP */}

            <Pressable
              onPress={() =>
                router.push('/signup')
              }
              disabled={
                loading ||
                googleLoading ||
                appleLoading
              }
            >
              <Text style={styles.link}>
                Don't have an account?{' '}
                <Text
                  style={styles.linkAccent}
                >
                  Sign up
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    borderWidth: 2,
    borderColor: 'transparent',
  },

  buttonPressed: {
    borderColor: COLORS.accentHover,
  },

  buttonDisabled: {
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
