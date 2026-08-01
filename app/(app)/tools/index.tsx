import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

type Tool = {
  id: string; name: string; type?: string;
  brand?: string; purchase_date?: string; notes?: string;
};

const TOOL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  brush: 'brush-outline',
  lamp: 'bulb-outline',
  file: 'document-outline',
  buffer: 'layers-outline',
  drill: 'settings-outline',
  default: 'build-outline',
};

function toolIcon(type?: string): keyof typeof Ionicons.glyphMap {
  if (!type) return TOOL_ICONS.default;
  const key = type.toLowerCase();
  return TOOL_ICONS[key] ?? TOOL_ICONS.default;
}

export default function ToolsScreen() {
  const { token } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tools/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load tools');
      setTools(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchTools(); }, [fetchTools]));
  const onRefresh = () => { setRefreshing(true); fetchTools(); };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Tools</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/tools/add')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tools}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListHeaderComponent={
          loading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={COLORS.accent} /></View>
          ) : error ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchTools} style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.myToolsHeader}>My Tools</Text>
          )
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.empty}>
              <Ionicons name="build-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No tools yet</Text>
              <Text style={styles.emptySubtitle}>Track your brushes, lamps, files and more.</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/tools/add')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Add a Tool</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => router.push(`/(app)/tools/${item.id}` as any)}
            activeOpacity={0.75}
          >
            <View style={styles.toolIcon}>
              <Ionicons name={toolIcon(item.type)} size={20} color={COLORS.accent} />
            </View>
            <View style={styles.toolBody}>
              <Text style={styles.toolName}>{item.name}</Text>
              <Text style={styles.toolMeta}>
                {[item.type, item.brand].filter(Boolean).join(' · ') || 'No details'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  homeBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { padding: 4 },
  list: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48, gap: 12 },
  myToolsHeader: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4, marginBottom: 4 },
  loadingWrap: { alignItems: 'center', paddingVertical: 24 },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
  toolCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 12, ...SHADOW.small },
  toolIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  toolBody: { flex: 1 },
  toolName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  toolMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 20, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 4 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
});
