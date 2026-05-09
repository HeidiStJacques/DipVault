import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Product = {
  id: string;
  name: string;
  brand?: string;
  shade_name?: string;
  type?: string;
  finish?: string;
  color_family?: string;
  collection_name?: string;
  sku?: string;
  description?: string;
  notes?: string;
  purchase_date?: string;
  purchase_price?: number;
  quantity: number;
  low_stock_threshold: number;
  status: string;
  is_favorite: boolean;
  swatched: boolean;
  is_archived: boolean;
  image_url?: string;
  vaults?: { id: string; name: string }[];
};

type Row = { label: string; value: string | number | boolean | undefined | null };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load product');
      setProduct(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProduct();
    }, [fetchProduct])
  );

  const toggleFavorite = async () => {
    if (!product) return;
    try {
      const res = await fetch(`${API_BASE}/products/${id}/favorite`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProduct(updated);
    } catch {
      Alert.alert('Error', 'Could not update favorite.');
    }
  };

  const toggleArchive = async () => {
    if (!product) return;
    const action = product.is_archived ? 'Unarchive' : 'Archive';
    Alert.alert(`${action} Product`, `${action} "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/products/${id}/archive`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setProduct(updated);
          } catch {
            Alert.alert('Error', 'Could not update product.');
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', `Permanently delete "${product?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/products/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            // Go back to vault if we have one, otherwise collection
            if (product?.vaults && product.vaults.length > 0) {
              router.replace(`/(app)/collection/${product.vaults[0].id}` as any);
            } else {
              router.replace('/(app)/collection/');
            }
          } catch {
            Alert.alert('Error', 'Could not delete product.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || 'Product not found.'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const details: Row[] = [
    { label: 'Brand', value: product.brand },
    { label: 'Shade', value: product.shade_name },
    { label: 'Type', value: product.type },
    { label: 'Finish', value: product.finish },
    { label: 'Color Family', value: product.color_family },
    { label: 'Collection', value: product.collection_name },
    { label: 'SKU', value: product.sku },
    { label: 'Purchase Date', value: product.purchase_date },
    { label: 'Purchase Price', value: product.purchase_price != null ? `$${product.purchase_price}` : undefined },
    { label: 'Quantity', value: product.quantity },
    { label: 'Low Stock At', value: product.low_stock_threshold },
    { label: 'Status', value: product.status },
  ].filter((r) => r.value != null && r.value !== '');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteBtn}>
          <Ionicons
            name={product.is_favorite ? 'heart' : 'heart-outline'}
            size={22}
            color={product.is_favorite ? COLORS.accent : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Title card */}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="cube-outline" size={28} color={COLORS.accent} />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.brand ? <Text style={styles.productBrand}>{product.brand}</Text> : null}
            </View>
          </View>

          {/* Badges */}
          <View style={styles.badges}>
            {product.is_favorite && (
              <View style={styles.badge}>
                <Ionicons name="heart" size={12} color={COLORS.accent} />
                <Text style={styles.badgeText}>Favorite</Text>
              </View>
            )}
            {product.swatched && (
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.accent} />
                <Text style={styles.badgeText}>Swatched</Text>
              </View>
            )}
            {product.is_archived && (
              <View style={[styles.badge, styles.badgeMuted]}>
                <Ionicons name="archive" size={12} color={COLORS.textSecondary} />
                <Text style={[styles.badgeText, styles.badgeTextMuted]}>Archived</Text>
              </View>
            )}
            <View style={[styles.badge, product.status === 'low' || product.status === 'empty' ? styles.badgeWarn : null]}>
              <Text style={[styles.badgeText, product.status !== 'active' ? styles.badgeTextWarn : null]}>
                {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        {details.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            {details.map((row, i) => (
              <View key={row.label}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{String(row.value)}</Text>
                </View>
                {i < details.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {product.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.bodyText}>{product.description}</Text>
          </View>
        ) : null}

        {/* Notes */}
        {product.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.bodyText}>{product.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push(`/(app)/product/edit/${id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="pencil-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.actionLabel}>Edit Product</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={toggleArchive} activeOpacity={0.7}>
            <View style={styles.actionIcon}>
              <Ionicons name="archive-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.actionLabel}>{product.is_archived ? 'Unarchive' : 'Archive'} Product</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleDelete} activeOpacity={0.7}>
            <View style={[styles.actionIcon, styles.actionIconDanger]}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </View>
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Delete Product</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  favoriteBtn: { padding: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 14 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    ...SHADOW.small,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { flex: 1 },
  productName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  productBrand: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeMuted: { backgroundColor: COLORS.background },
  badgeWarn: { backgroundColor: '#fdecea' },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.accent },
  badgeTextMuted: { color: COLORS.textSecondary },
  badgeTextWarn: { color: COLORS.error },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: COLORS.border },
  bodyText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: { backgroundColor: '#fdecea' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  actionLabelDanger: { color: COLORS.error },

  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
});