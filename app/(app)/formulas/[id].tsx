import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Ingredient = { id: string; display_name: string; measurement?: string };
type Formula = {
  id: string; title: string; notes?: string;
  star_rating?: number; image_url?: string;
  created_at: string; ingredients: Ingredient[];
};

function StarRow({ rating }: { rating?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={rating && s <= rating ? 'star' : 'star-outline'} size={20} color={COLORS.accent} />
      ))}
    </View>
  );
}

export default function FormulaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [formula, setFormula] = useState<Formula | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFormula = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/formulas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load formula');
      setFormula(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchFormula(); }, [fetchFormula]));

  const handleDelete = () => {
    Alert.alert('Delete Formula', `Permanently delete "${formula?.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_BASE}/formulas/${id}`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            router.replace('/(app)/formulas/');
          } catch { Alert.alert('Error', 'Could not delete formula.'); }
        },
      },
    ]);
  };

  if (loading) return <SafeAreaView style={styles.safe}><View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View></SafeAreaView>;
  if (error || !formula) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}><Text style={styles.retryText}>Go back</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{formula.title}</Text>
        <TouchableOpacity onPress={() => router.push(`/(app)/formulas/edit/${id}` as any)} style={styles.editBtn}>
          <Ionicons name="pencil-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photo */}
        {formula.image_url && (
          <Image source={{ uri: formula.image_url }} style={styles.heroImage} resizeMode="cover" />
        )}

        {/* Title + rating */}
        <View style={styles.card}>
          <Text style={styles.formulaTitle}>{formula.title}</Text>
          <StarRow rating={formula.star_rating} />
          <Text style={styles.dateText}>
            Created {new Date(formula.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Ingredients */}
        {formula.ingredients.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {formula.ingredients.map((ing, i) => (
              <View key={ing.id}>
                <View style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{ing.display_name}</Text>
                  {ing.measurement ? (
                    <View style={styles.measureBadge}>
                      <Text style={styles.measureText}>{ing.measurement}</Text>
                    </View>
                  ) : null}
                </View>
                {i < formula.ingredients.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {formula.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{formula.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push(`/(app)/formulas/edit/${id}` as any)} activeOpacity={0.7}>
            <View style={styles.actionIcon}><Ionicons name="pencil-outline" size={18} color={COLORS.accent} /></View>
            <Text style={styles.actionLabel}>Edit Formula</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={handleDelete} activeOpacity={0.7}>
            <View style={[styles.actionIcon, styles.actionIconDanger]}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></View>
            <Text style={[styles.actionLabel, styles.actionLabelDanger]}>Delete Formula</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  editBtn: { padding: 4 },
  scroll: { paddingBottom: 48, gap: 14 },
  heroImage: { width: '100%', height: 300 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, marginHorizontal: 20, ...SHADOW.small },
  formulaTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  dateText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  ingredientName: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  measureBadge: { backgroundColor: COLORS.accentSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  measureText: { fontSize: 13, fontWeight: '600', color: COLORS.accent },
  divider: { height: 1, backgroundColor: COLORS.border },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  actionIconDanger: { backgroundColor: '#fdecea' },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  actionLabelDanger: { color: COLORS.error },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
});