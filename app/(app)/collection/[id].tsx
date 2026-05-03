import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { COLORS } from '../../../constants/theme';

type Product = {
  id: string;
  brand: string;
  name: string;
  shade_name?: string | null;
  finish?: string | null;
  product_type?: string | null;
  collection_name?: string | null;
  shade_code?: string | null;
  size_value?: string | number | null;
  size_unit?: string | null;
  expiration_date?: string | null;
  notes?: string | null;
  image_url?: string | null;
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    brand: 'Kiara Sky',
    name: 'Rose Veil',
    shade_name: 'Rose Veil',
    finish: 'Creme',
    product_type: 'Dip Powder',
    collection_name: 'Spring Blossoms',
    shade_code: 'KS-101',
    size_value: '1',
    size_unit: 'oz',
    expiration_date: '2027-03-01',
    notes: 'Perfect soft pink nude for everyday wear.',
    image_url: 'https://via.placeholder.com/600x400/F3E9DC/8B6F47?text=Rose+Veil',
  },
  {
    id: '2',
    brand: 'Revel',
    name: 'Champagne Lace',
    shade_name: 'Champagne Lace',
    finish: 'Shimmer',
    product_type: 'Dip Powder',
    collection_name: 'Evening Glam',
    shade_code: 'RV-210',
    size_value: '0.5',
    size_unit: 'oz',
    expiration_date: '2027-06-15',
    notes: 'A soft gold shimmer that looks beautiful in bright light.',
    image_url: 'https://via.placeholder.com/600x400/F7F4ED/B08A3E?text=Champagne+Lace',
  },
];

export default function DipDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [dip, setDip] = useState<Product | null>(null);

  const fetchDip = useCallback(async () => {
    try {
      const found = MOCK_PRODUCTS.find((item) => item.id === String(id));

      if (found) {
        setDip(found);
      } else {
        setDip(null);
      }
    } catch (error) {
      console.log(error);
      setDip(null);
    }
  }, [id]);

  useEffect(() => {
    fetchDip();
  }, [fetchDip]);

  if (!dip) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {dip.image_url && (
        <Image source={{ uri: dip.image_url }} style={styles.image} />
      )}

      <View style={styles.card}>
        <Text style={styles.brand}>{dip.brand}</Text>
        <Text style={styles.color}>{dip.shade_name || dip.name}</Text>
      </View>

      <View style={styles.card}>
        <DetailRow label="Finish" value={dip.finish} />
        <DetailRow label="Type" value={dip.product_type} />
        <DetailRow label="Collection" value={dip.collection_name} />
        <DetailRow label="Color Code" value={dip.shade_code} />
        <DetailRow
          label="Size"
          value={
            dip.size_value && dip.size_unit
              ? `${dip.size_value} ${dip.size_unit}`
              : null
          }
        />
        <DetailRow label="Expiration Date" value={dip.expiration_date} />
      </View>

      {dip.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{dip.notes}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.goldBtn}>
          <Text style={styles.goldBtnText}>Favorite</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  image: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.border,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },

  brand: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },

  color: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },

  notes: {
    fontSize: 14,
    color: COLORS.text,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  primaryBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  goldBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.border,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  primaryBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  goldBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  back: {
    marginTop: 20,
    textAlign: 'center',
    color: COLORS.text,
    fontWeight: '500',
  },
});