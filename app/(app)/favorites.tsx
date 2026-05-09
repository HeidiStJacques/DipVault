import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../constants/api';
import { COLORS, RADIUS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH; // square like Instagram

type Product = {
  id: string;
  name: string;
  brand?: string;
  shade_name?: string;
  image_url?: string;
  is_favorite: boolean;
  vault_id?: string;
};

export default function FavoritesScreen() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/products/?is_favorite=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load favorites');
      const data: Product[] = await res.json();
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
      fetchFavorites();
    }, [fetchFavorites])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleUnfavorite = async (id: string) => {
    // Optimistic update
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`${API_BASE}/products/${id}/favorite`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Refetch on failure
      fetchFavorites();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(app)/home')} style={styles.homeBtn}>
          <Ionicons name="home-outline" size={20} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Favorites</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchFavorites} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptySubtitle}>
                Double-tap any product photo or tap the heart to save it here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <FeedCard
              product={item}
              onUnfavorite={() => handleUnfavorite(item.id)}
              onPress={() => router.push(`/(app)/product/${item.id}` as any)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ── Feed Card ─────────────────────────────────────────────────────────────────

function FeedCard({
  product,
  onUnfavorite,
  onPress,
}: {
  product: Product;
  onUnfavorite: () => void;
  onPress: () => void;
}) {
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
      // Double tap — toggle off if already favorited (in this screen it always is)
      burstHeart();
      onUnfavorite();
    }
    lastTap.current = now;
  };

  return (
    <View style={cardStyles.container}>
      {/* Top bar: name + brand */}
      <TouchableOpacity style={cardStyles.topBar} onPress={onPress} activeOpacity={0.8}>
        <View style={cardStyles.avatar}>
          <Ionicons name="cube-outline" size={16} color={COLORS.accent} />
        </View>
        <View style={cardStyles.topText}>
          <Text style={cardStyles.productName} numberOfLines={1}>{product.name}</Text>
          {product.brand ? (
            <Text style={cardStyles.brandName} numberOfLines={1}>{product.brand}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Photo */}
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={cardStyles.photoWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={cardStyles.photo} resizeMode="cover" />
        ) : (
          <View style={cardStyles.photoPlaceholder}>
            <Ionicons name="image-outline" size={48} color={COLORS.border} />
            <Text style={cardStyles.placeholderText}>No photo</Text>
          </View>
        )}

        {/* Double-tap heart burst */}
        <Animated.View
          style={[
            cardStyles.heartBurst,
            { transform: [{ scale: heartScale }], opacity: heartOpacity },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={90} color="white" />
        </Animated.View>
      </TouchableOpacity>

      {/* Bottom bar: heart + shade */}
      <View style={cardStyles.bottomBar}>
        <TouchableOpacity onPress={onUnfavorite} style={cardStyles.heartBtn} activeOpacity={0.7}>
          <Ionicons name="heart" size={26} color={COLORS.accent} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} style={cardStyles.moreBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-forward-circle-outline" size={26} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Shade name caption */}
      {product.shade_name ? (
        <View style={cardStyles.caption}>
          <Text style={cardStyles.captionText}>
            <Text style={cardStyles.captionBold}>{product.name} </Text>
            {product.shade_name}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  topText: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  brandName: { fontSize: 12, color: COLORS.textSecondary },
  photoWrap: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: SCREEN_WIDTH, height: PHOTO_HEIGHT },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 14, color: COLORS.textSecondary },
  heartBurst: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 12,
  },
  heartBtn: { padding: 2 },
  moreBtn: { padding: 2 },
  caption: { paddingHorizontal: 14, paddingBottom: 12 },
  captionText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  captionBold: { fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  homeBtn: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: COLORS.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.error, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.accentSoft, borderRadius: RADIUS.md },
  retryText: { color: COLORS.accent, fontWeight: '600' },
  separator: { height: 8, backgroundColor: COLORS.background },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});