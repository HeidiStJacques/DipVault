import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';
import ImagePickerButton from '../../components/ImagePickerButton';

const APP_VERSION = '1.0.0';

export default function AccountScreen() {
  const { token, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [nameChanged, setNameChanged] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setEmail(data.email ?? '');
        setDisplayName(data.display_name ?? '');
        setProfileImageUrl(data.profile_image_url ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, [token]);

  const handleSaveDisplayName = async () => {
    setNameError('');
    setNameSuccess('');
    try {
      setNameSaving(true);
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update display name');
      setDisplayName(data.display_name ?? '');
      setNameChanged(false);
      setNameSuccess('Display name updated.');
    } catch (err: any) {
      setNameError(err.message || 'Something went wrong.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    try {
      setPwLoading(true);
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      setPwSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err: any) {
      setPwError(err.message || 'Something went wrong.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/auth/delete-account`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch {}
            signOut();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Account</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card */}
        <View style={[styles.card, styles.profileCard]}>
          {loadingUser ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <ImagePickerButton
                uploadUrl="/auth/me/photo"
                imageUrl={profileImageUrl}
                onUploadComplete={(url: string) => setProfileImageUrl(url)}
                onDeleteComplete={() => setProfileImageUrl(null)}
              />

              <View style={styles.nameBlock}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={styles.nameInput}
                  placeholder="Add a display name"
                  placeholderTextColor={COLORS.textSecondary}
                  value={displayName}
                  onChangeText={(v) => {
                    setDisplayName(v);
                    setNameChanged(true);
                    setNameSuccess('');
                  }}
                />
                {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
                {nameSuccess ? <Text style={styles.success}>{nameSuccess}</Text> : null}
                {nameChanged && (
                  <TouchableOpacity
                    style={styles.saveNameButton}
                    onPress={handleSaveDisplayName}
                    disabled={nameSaving}
                  >
                    {nameSaving
                      ? <ActivityIndicator color={COLORS.white} />
                      : <Text style={styles.saveNameButtonText}>Save</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.emailText}>{email}</Text>
            </>
          )}
        </View>

        {/* Actions card */}
        <View style={styles.card}>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowChangePassword((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.rowLabel}>Change Password</Text>
            <Ionicons name={showChangePassword ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.border} />
          </TouchableOpacity>

          {showChangePassword && (
            <View style={styles.pwForm}>
              {pwError ? <Text style={styles.error}>{pwError}</Text> : null}
              {pwSuccess ? <Text style={styles.success}>{pwSuccess}</Text> : null}
              <TextInput
                style={styles.input}
                placeholder="Current password"
                placeholderTextColor={COLORS.textSecondary}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={COLORS.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.pwButton} onPress={handleChangePassword} disabled={pwLoading}>
                {pwLoading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.pwButtonText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          {/* Sign Out */}
          <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={styles.rowIcon}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.rowLabel}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Delete Account */}
          <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <View style={[styles.rowIcon, styles.rowIconDanger]}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </View>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>

        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>DipVault</Text>
          <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  homeBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    ...SHADOW.small,
  },
  profileCard: { alignItems: 'center' },

  nameBlock: { width: '100%', marginTop: 16, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  nameInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  saveNameButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  saveNameButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  emailText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', marginTop: 14 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#fdecea' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowLabelDanger: { color: COLORS.error },
  divider: { height: 1, backgroundColor: COLORS.border },

  pwForm: { paddingBottom: 8, gap: 10 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  pwButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  pwButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  error: { color: COLORS.error, fontSize: 13 },
  success: { color: COLORS.success, fontSize: 13 },

  appInfo: { alignItems: 'center', paddingTop: 4, gap: 4 },
  appName: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  appVersion: { fontSize: 13, color: COLORS.border },
});
