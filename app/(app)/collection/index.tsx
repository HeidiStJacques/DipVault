import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
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
  color_family?: string;
  purchase_date?: string;
  quantity: number;
  is_favorite: boolean;
  image_url?: string;
};

type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'brand_asc'
  | 'date_newest'
  | 'date_oldest'
  | 'favorites_first';

const SORT_LABELS: Record<SortOption, string> = {
  name_asc: 'Name (A–Z)',
  name_desc: 'Name (Z–A)',
  brand_asc: 'Brand (A–Z)',
  date_newest: 'Date Added (Newest)',
  date_oldest: 'Date Added (Oldest)',
  favorites_first: 'Favorites First',
};

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const list = [...products];
  switch (sort) {
    case 'name_asc':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'brand_asc':
      return list.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
    case 'date_newest':
      return list.sort(
        (a, b) => new Date(b.purchase_date || 0).getTime() - new Date(a.purchase_date || 0).getTime()
      );
    case 'date_oldest':
      return list.sort(
        (a, b) => new Date(a.purchase_date || 0).getTime() - new Date(b.purchase_date || 0).getTime()
      );
    case 'favorites_first':
      return list.sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
    default:
      return list;
  }
}

export default function CollectionScreen() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortOption>('date_newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load your collection');
      const data = await res.json();
      setProducts(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProducts();
    }, [fetchProducts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const sortedProducts = useMemo(() => sortProducts(products, sort), [products, sort]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.iconBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/product/add' as any)} style={styles.iconBtn}>
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.sortBar} onPress={() => setSortMenuOpen(true)} activeOpacity={0.75}>
        <Ionicons name="swap-vertical-outline" size={16} color={COLORS.accent} />
        <Text style={styles.sortBarText}>{SORT_LABELS[sort]}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={sortMenuOpen} transparent animationType="fade" onRequestClose={() => setSortMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSortMenuOpen(false)}>
          <View style={styles.sortMenu}>
            {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setSort(option);
                  setSortMenuOpen(false);
                }}
              >
                <Text style={[styles.sortOptionText, sort === option && styles.sortOptionTextActive]}>
                  {SORT_LABELS[option]}
                </Text>
                {sort === option && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchProducts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedProducts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="color-palette-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>Your collection is empty</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/product/add' as any)} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Add your first product</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/product/${item.id}` as any)}
              activeOpacity={0.75}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.cardImage} />
              ) : (
                <View style={styles.cardIcon}>
                  <Ionicons name="color-palette-outline" size={20} color={COLORS.accent} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={1}>
                  {[item.brand, item.shade_name].filter(Boolean).join(' · ') || ' '}
                </Text>
              </View>
              {item.is_favorite && <Ionicons name="heart" size={16} color={COLORS.accent} />}
              <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingBottom: 12,
  },
  iconBtn: { padding: 4 },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  sortBarText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', paddingHorizontal: 40 },
  sortMenu: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    ...SHADOW.small,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sortOptionText: { fontSize: 15, color: COLORS.text },
  sortOptionTextActive: { color: COLORS.accent, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 12,
    ...SHADOW.small,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  emptyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
});
