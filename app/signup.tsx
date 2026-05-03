import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export default function CollectionScreen() {
  const BACKEND_URL = 'http://192.168.40.204:8000';

  const [products, setProducts] = useState<any[]>([]);

  const fetchProducts = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');

      const response = await fetch(
        `${BACKEND_URL}/products?user_id=${userId}`
      );

      const data = await response.json();

      setProducts(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <Text style={styles.text}>{item.brand}</Text>
      <Text style={styles.sub}>{item.shade_name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 10,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  image: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },

  text: {
    color: COLORS.accent,
    fontWeight: '600',
  },

  sub: {
    color: COLORS.textSecondary,
  },
});