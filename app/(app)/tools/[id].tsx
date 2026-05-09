import React, { useCallback, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

export default function ToolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetch(`${API_BASE}/tools/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((t) => {
          setName(t.name ?? '');
          setType(t.type ?? '');
          setBrand(t.brand ?? '');
          setPurchaseDate(t.purchase_date ?? '');
          setNotes(t.notes ?? '');
        })
        .catch(() => setError('Failed to load tool.'))
        .finally(() => setLoading(false));
    }, [id, token])
  );

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Tool name is required.'); return; }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          type: type.trim() || null,
          brand: brand.trim() || null,
          purchase_date: purchaseDate.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save.');
      router.replace('/(app)/tools/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Tool', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/tools/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            router.replace('/(app)/tools/');
          } catch { Alert.alert('Error', 'Could not delete tool.'); }
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{name || 'Tool'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.label}>Tool Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Gel Brush #8" placeholderTextColor={COLORS.textSecondary} value={name} onChangeText={setName} />
            <Text style={styles.label}>Type</Text>
            <TextInput style={styles.input} placeholder="brush, lamp, file, buffer, drill…" placeholderTextColor={COLORS.textSecondary} value={type} onChangeText={setType} />
            <Text style={styles.label}>Brand</Text>
            <TextInput style={styles.input} placeholder="e.g. Makartt" placeholderTextColor={COLORS.textSecondary} value={brand} onChangeText={setBrand} />
            <Text style={styles.label}>Purchase Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} value={purchaseDate} onChangeText={setPurchaseDate} />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.textArea]} placeholder="Condition, usage tips…" placeholderTextColor={COLORS.textSecondary} value={notes} onChangeText={setNotes} multiline />
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.deleteRow} onPress={handleDelete} activeOpacity={0.7}>
              <View style={styles.deleteIcon}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></View>
              <Text style={styles.deleteLabel}>Delete Tool</Text>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, ...SHADOW.small },
  error: { color: COLORS.error, fontSize: 13, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, marginBottom: 16 },
  textArea: { height: 90, textAlignVertical: 'top' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  deleteIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fdecea', alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.error },
});