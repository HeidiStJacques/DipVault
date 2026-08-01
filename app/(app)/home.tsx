import React from 'react';
import {
  View,
  Text,
  Pressable,
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
};

const TILES: Tile[][] = [
  [
    { label: 'My Collection', icon: 'archive-outline', route: '/(app)/collection/' },
    { label: 'Add Product', icon: 'add-circle-outline', route: '/(app)/product/add' },
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
          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {TILES.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((tile) => (
                <Pressable
                  key={tile.label}
                  onPress={() => router.push(tile.route as any)}
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && styles.tilePressed,
                  ]}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={tile.icon} size={22} color={COLORS.accent} />
                  </View>
                  <Text style={styles.tileLabel}>{tile.label}</Text>
                </Pressable>
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
    borderWidth: 1.5,
    borderColor: '#4A4A4A',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    gap: 14,
    ...SHADOW.small,
  },
  tilePressed: {
    borderWidth: 3,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
});
