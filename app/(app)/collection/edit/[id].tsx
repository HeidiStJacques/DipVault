import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { API_BASE } from '../../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../../constants/theme';

export default function EditVaultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetch(`${API_BASE}/vaults/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => { setName(data.name ?? ''); setDescription(data.description ?? ''); })
        .catch(() => setError('Failed to load vault.'))
        .finally(() => setLoading(false));
    }, [id, token])
  );

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Vault name is required.'); return; }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/vaults/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save.');
      router.replace(`/(app)/collection/${id}` as any);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Vault',
      'This will permanently delete this vault and all products inside it. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/vaults/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              router.replace('/(app)/collection/');
            } catch { Alert.alert('Error', 'Could not delete vault.'); }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Vault</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving
              ? <ActivityIndicator size="small" color={COLORS.accent} />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Vault Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Everyday Dips"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's in this vault?"
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.deleteRow} onPress={handleDelete} activeOpacity={0.7}>
              <View style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </View>
              <Text style={styles.deleteLabel}>Delete Vault</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveBtn: { minWidth: 40, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  body: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.small },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: COLORS.text, marginBottom: 18,
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  deleteIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fdecea', alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.error },
});