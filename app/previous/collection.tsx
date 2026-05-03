import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { useRouter } from 'expo-router';

export default function CollectionScreen() {
  const router = useRouter();
  const BACKEND_URL = 'http://192.168.40.204:8000';

  const [products, setProducts] = useState<any[]>([]);

  const fetchProducts = async () => {
    const userId = await AsyncStorage.getItem('userId');

    const response = await fetch(
      `${BACKEND_URL}/products?user_id=${userId}`
    );

    const data = await response.json();

    setProducts(data);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ❌ DELETE
  const deleteProduct = async (id: number) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          await fetch(`${BACKEND_URL}/products/${id}`, {
            method: 'DELETE',
          });

          fetchProducts(); // refresh list
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>

      <Image source={{ uri: item.image_url }} style={styles.image} />

      <Text style={styles.text}>{item.brand}</Text>
      <Text style={styles.sub}>{item.shade_name}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            router.push({
              pathname: '/edit-product',
              params: { product: JSON.stringify(item) },
            })
          }
        >
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteProduct(item.id)}
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>

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

  actions: {
    flexDirection: 'row',
    marginTop: 10,
  },

  editBtn: {
    backgroundColor: COLORS.accent,
    padding: 8,
    borderRadius: 8,
    marginRight: 10,
  },

  deleteBtn: {
    backgroundColor: 'red',
    padding: 8,
    borderRadius: 8,
  },

  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
});