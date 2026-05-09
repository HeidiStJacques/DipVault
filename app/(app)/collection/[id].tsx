import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
  flavor?: string;
  is_favorite?: boolean;
};

type Vault = {
  id: string;
  name: string;
  description?: string;
};

export default function VaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [vault, setVault] = useState<Vault | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [vaultRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/vaults/${id}`, { headers }),
        fetch(`${API_BASE}/products/?vault_id=${id}`, { headers }),
      ]);

      if (!vaultRes.ok) throw new Error('Failed to load vault');
      const [vaultData, productsData] = await Promise.all([
        vaultRes.json(),
        productsRes.ok ? productsRes.json() : [],
      ]);

      setVault(vaultData);
      setProducts(productsData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{vault?.name ?? 'Vault'}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/(app)/collection/edit/${id}` as any)}
          style={styles.addBtn}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(app)/product/add', params: { vaultId: id } })}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {vault?.description ? (
        <Text style={styles.desc}>{vault.description}</Text>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No products yet</Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/(app)/product/add', params: { vaultId: id } })}
                style={styles.emptyBtn}
              >
                <Text style={styles.emptyBtnText}>Add first product</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/product/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="cube-outline" size={18} color={COLORS.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.brand || item.flavor ? (
                  <Text style={styles.cardSub}>
                    {[item.brand, item.flavor].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
              {item.is_favorite && (
                <Ionicons name="heart" size={16} color={COLORS.accent} />
              )}
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
    paddingBottom: 8,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.text },
  addBtn: { padding: 4 },
  desc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, gap: 10 },
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary },
  emptyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
});