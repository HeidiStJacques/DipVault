import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { useRouter, useFocusEffect } from 'expo-router';

export default function DipsScreen() {
  const router = useRouter();
  const [dips, setDips] = useState<any[]>([]);

  const fetchDips = async () => {
    const { data, error } = await supabase
      .from('nail_dips')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.log(error);
    } else {
      setDips(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDips();
    }, [])
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: '/dip/[id]',
          params: { id: item.id },
        })
      }
      style={styles.card}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      )}

      <Text style={styles.brand}>{item.brand}</Text>
      <Text style={styles.color}>{item.color}</Text>

      <View style={styles.buttonRow}>
        <View style={styles.viewBtn}>
          <Text style={styles.btnText}>View</Text>
        </View>

        <View style={styles.favoriteBtn}>
          <Text style={styles.btnText}>★</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/')}>
          <Text style={styles.homeText}>🏠</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Collection</Text>

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-dip')}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={dips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },

  homeBtn: {
    backgroundColor: COLORS.soft,
    padding: 10,
    borderRadius: 10,
  },

  homeText: {
    fontSize: 16,
  },

  addBtn: {
    backgroundColor: COLORS.accent,
    padding: 10,
    borderRadius: 10,
  },

  addText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  /* CARD */
  card: {
    backgroundColor: COLORS.soft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },

  brand: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },

  color: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* BUTTON ROW */
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  viewBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  favoriteBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  btnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});