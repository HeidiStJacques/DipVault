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
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Vault = {
  id: string;
  name: string;
  description?: string;
  product_count?: number;
};

export default function CollectionScreen() {
  const { token } = useAuth();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchVaults = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/vaults/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load vaults');
      const data = await res.json();
      setVaults(data);
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
      fetchVaults();
    }, [fetchVaults])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVaults();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.backBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>My Collection</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/collection/add')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchVaults} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vaults}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No vaults yet</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/collection/add')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Create your first vault</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/collection/${item.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="archive-outline" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                ) : null}
              </View>
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
    paddingBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  addBtn: { padding: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 14,
    ...SHADOW.small,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
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