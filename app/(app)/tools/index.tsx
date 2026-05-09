import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const res = await fetch(`${API_BASE}/tools/export/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const json = await res.text();
      await Share.share({ message: json, title: 'DipVault Export' });
    } catch (err: any) {
      Alert.alert('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await fetch(`${API_BASE}/tools/export/products/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const csv = await res.text();
      await Share.share({ message: csv, title: 'DipVault Products CSV' });
    } catch (err: any) {
      Alert.alert('Export failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
      if (result.canceled) return;

      setImporting(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: file.uri, type: 'text/csv', name: file.name } as any);

      const res = await fetch(`${API_BASE}/tools/import/products/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Import failed');

      const msg = `Imported ${data.imported} products.${data.errors.length > 0 ? `\n\n${data.errors.slice(0, 3).join('\n')}${data.errors.length > 3 ? `\n...and ${data.errors.length - 3} more` : ''}` : ''}`;
      Alert.alert('Import complete', msg);
    } catch (err: any) {
      Alert.alert('Import failed', err.message);
    } finally {
      setImporting(false);
    }
  };

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
          <>
            {/* App Utilities */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>App Utilities</Text>

              <TouchableOpacity style={styles.utilRow} onPress={handleExportJSON} disabled={exporting} activeOpacity={0.7}>
                <View style={styles.utilIcon}><Ionicons name="download-outline" size={18} color={COLORS.accent} /></View>
                <View style={styles.utilText}>
                  <Text style={styles.utilLabel}>Export All Data</Text>
                  <Text style={styles.utilSub}>Full backup as JSON</Text>
                </View>
                {exporting ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="chevron-forward" size={16} color={COLORS.border} />}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.utilRow} onPress={handleExportCSV} disabled={exporting} activeOpacity={0.7}>
                <View style={styles.utilIcon}><Ionicons name="document-text-outline" size={18} color={COLORS.accent} /></View>
                <View style={styles.utilText}>
                  <Text style={styles.utilLabel}>Export Products CSV</Text>
                  <Text style={styles.utilSub}>Spreadsheet-friendly format</Text>
                </View>
                {exporting ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="chevron-forward" size={16} color={COLORS.border} />}
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.utilRow} onPress={handleImportCSV} disabled={importing} activeOpacity={0.7}>
                <View style={styles.utilIcon}><Ionicons name="cloud-upload-outline" size={18} color={COLORS.accent} /></View>
                <View style={styles.utilText}>
                  <Text style={styles.utilLabel}>Import Products</Text>
                  <Text style={styles.utilSub}>From a CSV file</Text>
                </View>
                {importing ? <ActivityIndicator size="small" color={COLORS.accent} /> : <Ionicons name="chevron-forward" size={16} color={COLORS.border} />}
              </TouchableOpacity>
            </View>

            {/* My Tools header */}
            {loading ? (
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
            )}
          </>
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
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: 20, ...SHADOW.small },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  utilRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  utilIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  utilText: { flex: 1 },
  utilLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  utilSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.border },
  myToolsHeader: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 4 },
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