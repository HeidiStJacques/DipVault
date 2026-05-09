import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Formula = {
  id: string; title: string; notes?: string;
  star_rating?: number; image_url?: string;
  ingredients: { id: string; display_name: string; measurement?: string }[];
};

function StarRow({ rating }: { rating?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={rating && s <= rating ? 'star' : 'star-outline'}
          size={13}
          color={COLORS.accent}
        />
      ))}
    </View>
  );
}

export default function FormulasScreen() {
  const { token } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFormulas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/formulas/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load formulas');
      setFormulas(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchFormulas(); }, [fetchFormulas]));
  const onRefresh = () => { setRefreshing(true); fetchFormulas(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Formulas</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/formulas/add')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchFormulas} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={formulas}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="flask-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No formulas yet</Text>
              <Text style={styles.emptySubtitle}>Start tracking your custom color recipes.</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/formulas/add')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Create a Formula</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/formulas/${item.id}` as any)}
              activeOpacity={0.75}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Ionicons name="flask-outline" size={24} color={COLORS.border} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <StarRow rating={item.star_rating} />
                {item.ingredients.length > 0 && (
                  <Text style={styles.cardIngredients} numberOfLines={1}>
                    {item.ingredients.map((i) => i.display_name).join(', ')}
                  </Text>
                )}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  homeBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { padding: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    ...SHADOW.small,
  },
  cardImage: { width: 80, height: 80 },
  cardImagePlaceholder: { backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, paddingVertical: 12, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardIngredients: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 4 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
});