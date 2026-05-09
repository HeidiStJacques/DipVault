import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Product = { id: string; name: string; brand?: string };
type Ingredient = { product_id?: string; name_override?: string; display_name: string; measurement: string };

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Ionicons name={s <= value ? 'star' : 'star-outline'} size={32} color={COLORS.accent} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AddFormulaScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [starRating, setStarRating] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Photo
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; mimeType: string; fileName: string } | null>(null);

  // Ingredient entry
  const [manualName, setManualName] = useState('');
  const [manualMeasurement, setManualMeasurement] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingProductName, setPendingProductName] = useState('');
  const [pendingMeasurement, setPendingMeasurement] = useState('');

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/products/`, { headers: { Authorization: `Bearer ${token}` } });
      setAllProducts(await res.json());
    } catch {} finally { setLoadingProducts(false); }
  };

  const pickPhoto = async () => {
    Alert.alert('Add Photo', '', [
      {
        text: 'Take Photo', onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled) setPendingPhoto({ uri: r.assets[0].uri, mimeType: r.assets[0].mimeType ?? 'image/jpeg', fileName: r.assets[0].fileName ?? 'photo.jpg' });
        }
      },
      {
        text: 'Choose from Library', onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') return;
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!r.canceled) setPendingPhoto({ uri: r.assets[0].uri, mimeType: r.assets[0].mimeType ?? 'image/jpeg', fileName: r.assets[0].fileName ?? 'photo.jpg' });
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addManualIngredient = () => {
    if (!manualName.trim()) return;
    setIngredients((prev) => [...prev, { name_override: manualName.trim(), display_name: manualName.trim(), measurement: manualMeasurement.trim() }]);
    setManualName('');
    setManualMeasurement('');
  };

  const removeIngredient = (index: number) => setIngredients((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }

    try {
      setSaving(true);

      // 1. Create formula
      const res = await fetch(`${API_BASE}/formulas/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || null,
          star_rating: starRating || null,
          ingredients: ingredients.map((ing, i) => ({
            product_id: ing.product_id ?? null,
            name_override: ing.name_override ?? null,
            measurement: ing.measurement || null,
            order: i,
          })),
        }),
      });
      const formula = await res.json();
      if (!res.ok) throw new Error(formula.detail || 'Failed to create formula');

      // 2. Upload photo if picked
      if (pendingPhoto) {
        const formData = new FormData();
        formData.append('file', { uri: pendingPhoto.uri, type: pendingPhoto.mimeType, name: pendingPhoto.fileName } as any);
        await fetch(`${API_BASE}/formulas/${formula.id}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      router.replace('/(app)/formulas/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New Formula</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Basic Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>

          {/* Photo */}
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
            {pendingPhoto ? (
              <View style={styles.photoBtnFilled}>
                <Ionicons name="image" size={32} color={COLORS.accent} />
                <Text style={styles.photoBtnFilledText}>Photo selected ✓</Text>
                <TouchableOpacity onPress={() => setPendingPhoto(null)} style={styles.photoRemove}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoBtnEmpty}>
                <Ionicons name="camera-outline" size={32} color={COLORS.textSecondary} />
                <Text style={styles.photoBtnText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Formula Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Coral Sunset Mix" placeholderTextColor={COLORS.textSecondary} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Application tips, finish, occasion…" placeholderTextColor={COLORS.textSecondary} value={notes} onChangeText={setNotes} multiline />

          <Text style={styles.label}>Rating</Text>
          <StarPicker value={starRating} onChange={setStarRating} />
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          {ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientRow}>
              <View style={styles.ingredientInfo}>
                <Text style={styles.ingredientName} numberOfLines={1}>{ing.display_name}</Text>
                {ing.measurement ? <Text style={styles.ingredientMeasurement}>{ing.measurement}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => removeIngredient(i)}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Pick from vault */}
          <TouchableOpacity style={styles.pickBtn} onPress={() => { fetchProducts(); setShowProductModal(true); }}>
            <Ionicons name="search-outline" size={16} color={COLORS.accent} />
            <Text style={styles.pickBtnText}>Pick from my products</Text>
          </TouchableOpacity>

          {/* Manual entry */}
          <Text style={styles.label}>Or add manually:</Text>
          <TextInput style={styles.input} placeholder="Ingredient name" placeholderTextColor={COLORS.textSecondary} value={manualName} onChangeText={setManualName} />
          <View style={styles.measureRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Measurement (e.g. 2 parts, 5ml)"
              placeholderTextColor={COLORS.textSecondary}
              value={manualMeasurement}
              onChangeText={setManualMeasurement}
            />
            <TouchableOpacity style={styles.addIngBtn} onPress={addManualIngredient}>
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Product Picker Modal */}
      <Modal visible={showProductModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick a Product</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          {pendingProductId ? (
            <View style={styles.measurementForm}>
              <Text style={styles.label}>Measurement for {pendingProductName}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2 parts, 5ml, 1 scoop"
                placeholderTextColor={COLORS.textSecondary}
                value={pendingMeasurement}
                onChangeText={setPendingMeasurement}
                autoFocus
              />
              <TouchableOpacity style={styles.button} onPress={() => {
                setIngredients((prev) => [...prev, {
                  product_id: pendingProductId,
                  display_name: pendingProductName,
                  measurement: pendingMeasurement.trim(),
                }]);
                setPendingProductId(null);
                setPendingProductName('');
                setPendingMeasurement('');
                setShowProductModal(false);
              }}>
                <Text style={styles.buttonText}>Add Ingredient</Text>
              </TouchableOpacity>
            </View>
          ) : loadingProducts ? (
            <View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View>
          ) : (
            <FlatList
              data={allProducts}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ padding: 20, gap: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalProduct}
                  onPress={() => {
                    setPendingProductId(item.id);
                    setPendingProductName(item.brand ? `${item.brand} ${item.name}` : item.name);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalProductName}>{item.name}</Text>
                    {item.brand ? <Text style={styles.modalProductBrand}>{item.brand}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveBtn: { minWidth: 40, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },
  error: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, ...SHADOW.small },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, marginBottom: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  photoBtn: { marginBottom: 16 },
  photoBtnEmpty: { height: 100, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoBtnFilled: { height: 100, borderRadius: RADIUS.lg, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative' },
  photoBtnFilledText: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },
  photoBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  photoRemove: { position: 'absolute', top: 8, right: 8 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, gap: 10 },
  ingredientInfo: { flex: 1 },
  ingredientName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  ingredientMeasurement: { fontSize: 13, color: COLORS.accent, marginTop: 2 },
  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginBottom: 10 },
  pickBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.accent },
  measureRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addIngBtn: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  measurementForm: { padding: 20 },
  button: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalProduct: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  modalProductName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalProductBrand: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});