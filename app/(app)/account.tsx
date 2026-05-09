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

const APP_VERSION = '1.0.0';

export default function AccountScreen() {
  const { token, signOut } = useAuth();

  const [email, setEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

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
      .then((data) => setEmail(data.email ?? ''))
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, [token]);

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
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={32} color={COLORS.accent} />
          </View>
          {loadingUser ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 12 }} />
          ) : (
            <Text style={styles.emailText}>{email}</Text>
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
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emailText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },

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