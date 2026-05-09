import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Switch, FlatList, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../../context/AuthContext';
import { API_BASE } from '../../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../../constants/theme';
import ImagePickerButton from '../../../../components/ImagePickerButton';

type Vault = { id: string; name: string };

type FormState = {
  name: string; brand: string; shade_name: string; type: string; finish: string;
  color_family: string; collection_name: string; sku: string; description: string;
  notes: string; purchase_date: string; purchase_price: string; quantity: string;
  low_stock_threshold: string; status: string;
  is_favorite: boolean; swatched: boolean; is_archived: boolean;
  image_url: string | null;
};

const STATUS_OPTIONS = ['active', 'low', 'empty'];

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: '', brand: '', shade_name: '', type: '', finish: '',
    color_family: '', collection_name: '', sku: '', description: '',
    notes: '', purchase_date: '', purchase_price: '', quantity: '1',
    low_stock_threshold: '1', status: 'active',
    is_favorite: false, swatched: false, is_archived: false, image_url: null,
  });
  const [selectedVaults, setSelectedVaults] = useState<Vault[]>([]);
  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/vaults/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setAllVaults)
      .catch(() => {});
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetch(`${API_BASE}/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((p) => {
          setForm({
            name: p.name ?? '', brand: p.brand ?? '', shade_name: p.shade_name ?? '',
            type: p.type ?? '', finish: p.finish ?? '', color_family: p.color_family ?? '',
            collection_name: p.collection_name ?? '', sku: p.sku ?? '',
            description: p.description ?? '', notes: p.notes ?? '',
            purchase_date: p.purchase_date ?? '', purchase_price: p.purchase_price != null ? String(p.purchase_price) : '',
            quantity: String(p.quantity ?? 1), low_stock_threshold: String(p.low_stock_threshold ?? 1),
            status: p.status ?? 'active', is_favorite: p.is_favorite ?? false,
            swatched: p.swatched ?? false, is_archived: p.is_archived ?? false,
            image_url: p.image_url ?? null,
          });
          setSelectedVaults(p.vaults ?? []);
        })
        .catch(() => setError('Failed to load product.'))
        .finally(() => setLoading(false));
    }, [id, token])
  );

  const set = (field: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleVault = (vault: Vault) => {
    setSelectedVaults((prev) =>
      prev.some((v) => v.id === vault.id)
        ? prev.filter((v) => v.id !== vault.id)
        : [...prev, vault]
    );
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) { setError('Product name is required.'); return; }
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(), brand: form.brand.trim() || null,
          shade_name: form.shade_name.trim() || null, type: form.type.trim() || null,
          finish: form.finish.trim() || null, color_family: form.color_family.trim() || null,
          collection_name: form.collection_name.trim() || null, sku: form.sku.trim() || null,
          description: form.description.trim() || null, notes: form.notes.trim() || null,
          purchase_date: form.purchase_date.trim() || null,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
          quantity: parseInt(form.quantity) || 1,
          low_stock_threshold: parseInt(form.low_stock_threshold) || 1,
          status: form.status, is_favorite: form.is_favorite,
          swatched: form.swatched, is_archived: form.is_archived,
          vault_ids: selectedVaults.map((v) => v.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save.');
      router.replace(`/(app)/product/${id}` as any);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Product</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ImagePickerButton
          uploadUrl={`/products/${id}/image`}
          imageUrl={form.image_url}
          onUploadComplete={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
          onDeleteComplete={() => setForm((prev) => ({ ...prev, image_url: null }))}
        />

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <Field label="Product Name *" value={form.name} onChange={set('name')} />
          <Field label="Brand" value={form.brand} onChange={set('brand')} />
          <Field label="Shade Name" value={form.shade_name} onChange={set('shade_name')} />
          <Field label="Type" value={form.type} onChange={set('type')} placeholder="dip, gel, polish, acrylic…" />
          <Field label="Finish" value={form.finish} onChange={set('finish')} placeholder="matte, shimmer, glitter…" last />
        </View>

        {/* Collections */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Collections</Text>
          <View style={styles.vaultChips}>
            {selectedVaults.map((v) => (
              <TouchableOpacity key={v.id} style={styles.chip} onPress={() => toggleVault(v)}>
                <Text style={styles.chipText}>{v.name}</Text>
                <Ionicons name="close-circle" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addVaultBtn} onPress={() => setShowVaultModal(true)}>
              <Ionicons name="add" size={16} color={COLORS.accent} />
              <Text style={styles.addVaultText}>Add to collection</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Classification */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Classification</Text>
          <Field label="Color Family" value={form.color_family} onChange={set('color_family')} />
          <Field label="Collection" value={form.collection_name} onChange={set('collection_name')} />
          <Field label="SKU" value={form.sku} onChange={set('sku')} last />
        </View>

        {/* Purchase Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Purchase Info</Text>
          <Field label="Purchase Date" value={form.purchase_date} onChange={set('purchase_date')} placeholder="YYYY-MM-DD" />
          <Field label="Purchase Price" value={form.purchase_price} onChange={set('purchase_price')} keyboardType="decimal-pad" placeholder="0.00" />
          <Field label="Quantity" value={form.quantity} onChange={set('quantity')} keyboardType="number-pad" />
          <Field label="Low Stock Threshold" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} keyboardType="number-pad" last />
        </View>

        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity key={s} style={[styles.statusChip, form.status === s && styles.statusChipActive]} onPress={() => set('status')(s)}>
                <Text style={[styles.statusChipText, form.status === s && styles.statusChipTextActive]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Flags */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Flags</Text>
          <ToggleRow label="Favorite" value={form.is_favorite} onChange={set('is_favorite')} />
          <View style={styles.divider} />
          <ToggleRow label="Swatched" value={form.swatched} onChange={set('swatched')} />
          <View style={styles.divider} />
          <ToggleRow label="Archived" value={form.is_archived} onChange={set('is_archived')} last />
        </View>

        {/* Description & Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Product description…" placeholderTextColor={COLORS.textSecondary} value={form.description} onChangeText={set('description') as (v: string) => void} multiline />
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea, { marginBottom: 0 }]} placeholder="Personal notes…" placeholderTextColor={COLORS.textSecondary} value={form.notes} onChangeText={set('notes') as (v: string) => void} multiline />
        </View>
      </ScrollView>

      {/* Vault picker modal */}
      <Modal visible={showVaultModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Collections</Text>
            <TouchableOpacity onPress={() => setShowVaultModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={allVaults}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ padding: 20, gap: 10 }}
            renderItem={({ item }) => {
              const selected = selectedVaults.some((v) => v.id === item.id);
              return (
                <TouchableOpacity style={[styles.modalVault, selected && styles.modalVaultSelected]} onPress={() => toggleVault(item)}>
                  <Text style={styles.modalVaultName}>{item.name}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={COLORS.accent} />}
                </TouchableOpacity>
              );
            }}
          />
          <View style={{ padding: 20 }}>
            <TouchableOpacity style={styles.button} onPress={() => setShowVaultModal(false)}>
              <Text style={styles.buttonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType = 'default', last = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'decimal-pad' | 'number-pad'; last?: boolean;
}) {
  return (
    <View style={[fStyles.wrap, !last && fStyles.border]}>
      <Text style={fStyles.label}>{label}</Text>
      <TextInput style={fStyles.input} value={value} onChangeText={onChange} placeholder={placeholder ?? '—'} placeholderTextColor={COLORS.textSecondary} keyboardType={keyboardType} />
    </View>
  );
}

function ToggleRow({ label, value, onChange, last = false }: {
  label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[tStyles.row, last && { paddingBottom: 0 }]}>
      <Text style={tStyles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor={COLORS.white} />
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap: { paddingVertical: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { fontSize: 15, color: COLORS.text },
});

const tStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveBtn: { minWidth: 40, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  error: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, ...SHADOW.small },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  vaultChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  addVaultBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addVaultText: { fontSize: 13, color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 12 },
  textArea: { height: 90, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusChip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.background },
  statusChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  statusChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  statusChipTextActive: { color: COLORS.white },
  divider: { height: 1, backgroundColor: COLORS.border },
  button: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalVault: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 16, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  modalVaultSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  modalVaultName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
});