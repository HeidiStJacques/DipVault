import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

type Tile = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  accent?: boolean;
};

const TILES: Tile[][] = [
  [
    { label: 'My Collection', icon: 'archive-outline', route: '/(app)/collection/' },
    { label: 'Add Product', icon: 'add-circle-outline', route: '/(app)/product/add', accent: true },
  ],
  [
    { label: 'Look Book', icon: 'images-outline', route: '/(app)/lookbook/' },
    { label: 'Favorites', icon: 'heart-outline', route: '/(app)/favorites' },
  ],
  [
    { label: 'Formulas', icon: 'flask-outline', route: '/(app)/formulas/' },
    { label: 'Tools', icon: 'build-outline', route: '/(app)/tools/' },
  ],
  [
    { label: 'Account', icon: 'person-outline', route: '/(app)/account' },
  ],
];

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>DipVault</Text>
            <Text style={styles.subtitle}>What are you working on?</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {TILES.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((tile) => (
                <TouchableOpacity
                  key={tile.label}
                  style={[styles.tile, tile.accent && styles.tileAccent]}
                  onPress={() => router.push(tile.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconWrap, tile.accent && styles.iconWrapAccent]}>
                    <Ionicons
                      name={tile.icon}
                      size={22}
                      color={tile.accent ? COLORS.white : COLORS.accent}
                    />
                  </View>
                  <Text style={[styles.tileLabel, tile.accent && styles.tileLabelAccent]}>
                    {tile.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  wordmark: {
    fontSize: 32,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  signOutBtn: { marginTop: 6, padding: 4 },
  grid: { gap: 14 },
  row: { flexDirection: 'row', gap: 14 },
  tile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    gap: 14,
    ...SHADOW.small,
  },
  tileAccent: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapAccent: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  tileLabelAccent: { color: COLORS.white },
});