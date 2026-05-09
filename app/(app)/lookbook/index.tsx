import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS } from '../../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LookPhoto = { id: string; image_url: string; order: number };
type LookProduct = { id: string; display_name: string };
type Look = {
  id: string; title: string; notes?: string;
  is_favorite: boolean; created_at: string;
  photos: LookPhoto[]; products: LookProduct[];
};

export default function LookBookScreen() {
  const { token } = useAuth();
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchLooks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/looks/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load looks');
      setLooks(await res.json());
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchLooks(); }, [fetchLooks]));

  const onRefresh = () => { setRefreshing(true); fetchLooks(); };

  const handleToggleFavorite = async (id: string) => {
    setLooks((prev) => prev.map((l) => l.id === id ? { ...l, is_favorite: !l.is_favorite } : l));
    try {
      await fetch(`${API_BASE}/looks/${id}/favorite`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      });
    } catch { fetchLooks(); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Look Book</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/lookbook/add')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.accent} /></View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLooks} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={looks}
          keyExtractor={(l) => l.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No looks yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to document your first nail look.</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/lookbook/add')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Create a Look</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <LookCard
              look={item}
              onToggleFavorite={() => handleToggleFavorite(item.id)}
              onPress={() => router.push(`/(app)/lookbook/${item.id}` as any)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function LookCard({ look, onToggleFavorite, onPress }: {
  look: Look; onToggleFavorite: () => void; onPress: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef<number>(0);

  const burstHeart = () => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 20, bounciness: 12 }),
      Animated.timing(heartOpacity, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      burstHeart();
      onToggleFavorite();
    }
    lastTap.current = now;
  };

  const currentPhoto = look.photos[photoIndex];

  return (
    <View style={cardStyles.container}>
      {/* Top bar */}
      <TouchableOpacity style={cardStyles.topBar} onPress={onPress} activeOpacity={0.8}>
        <View style={cardStyles.avatar}>
          <Ionicons name="images-outline" size={16} color={COLORS.accent} />
        </View>
        <View style={cardStyles.topText}>
          <Text style={cardStyles.lookTitle} numberOfLines={1}>{look.title}</Text>
          <Text style={cardStyles.lookDate}>
            {new Date(look.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={onPress} style={cardStyles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Photo */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={cardStyles.photoWrap}>
        {currentPhoto ? (
          <Image source={{ uri: currentPhoto.image_url }} style={cardStyles.photo} resizeMode="cover" />
        ) : (
          <View style={cardStyles.photoPlaceholder}>
            <Ionicons name="image-outline" size={48} color={COLORS.border} />
            <Text style={cardStyles.placeholderText}>No photos yet</Text>
          </View>
        )}

        {/* Multi-photo dots */}
        {look.photos.length > 1 && (
          <View style={cardStyles.dots}>
            {look.photos.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setPhotoIndex(i)}>
                <View style={[cardStyles.dot, i === photoIndex && cardStyles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Double-tap heart burst */}
        <Animated.View style={[cardStyles.heartBurst, { transform: [{ scale: heartScale }], opacity: heartOpacity }]} pointerEvents="none">
          <Ionicons name="heart" size={90} color="white" />
        </Animated.View>
      </TouchableOpacity>

      {/* Bottom bar */}
      <View style={cardStyles.bottomBar}>
        <TouchableOpacity onPress={onToggleFavorite} style={cardStyles.heartBtn} activeOpacity={0.7}>
          <Ionicons
            name={look.is_favorite ? 'heart' : 'heart-outline'}
            size={26}
            color={look.is_favorite ? COLORS.accent : COLORS.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} style={cardStyles.detailBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-forward-circle-outline" size={26} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Products used */}
      {look.products.length > 0 && (
        <View style={cardStyles.productsRow}>
          <Text style={cardStyles.productsLabel}>Products: </Text>
          <Text style={cardStyles.productsText} numberOfLines={2}>
            {look.products.map((p) => p.display_name).join(', ')}
          </Text>
        </View>
      )}

      {/* Notes caption */}
      {look.notes ? (
        <View style={cardStyles.caption}>
          <Text style={cardStyles.captionText} numberOfLines={3}>{look.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.card },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.accent },
  topText: { flex: 1 },
  lookTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  lookDate: { fontSize: 12, color: COLORS.textSecondary },
  moreBtn: { padding: 4 },
  photoWrap: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  photo: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { fontSize: 14, color: COLORS.textSecondary },
  dots: { position: 'absolute', bottom: 10, flexDirection: 'row', gap: 6, alignSelf: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: COLORS.white, width: 8, height: 8, borderRadius: 4 },
  heartBurst: { position: 'absolute', alignSelf: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 12 },
  heartBtn: { padding: 2 },
  detailBtn: { padding: 2 },
  productsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 4 },
  productsLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  productsText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  caption: { paddingHorizontal: 14, paddingBottom: 12 },
  captionText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});

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
  separator: { height: 8, backgroundColor: COLORS.background },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 4 },
  emptyBtnText: { color: COLORS.white, fontWeight: '700' },
});