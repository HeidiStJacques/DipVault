import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../constants/theme';

export default function DipDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [dip, setDip] = useState<any>(null);

  const fetchDip = async () => {
    const { data, error } = await supabase
      .from('nail_dips')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.log(error);
    } else {
      setDip(data);
    }
  };

  useEffect(() => {
    fetchDip();
  }, []);

  if (!dip) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: COLORS.primary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* IMAGE */}
      {dip.image_url && (
        <Image source={{ uri: dip.image_url }} style={styles.image} />
      )}

      {/* MAIN INFO */}
      <View style={styles.card}>
        <Text style={styles.brand}>{dip.brand}</Text>
        <Text style={styles.color}>{dip.color}</Text>
      </View>

      {/* DETAILS */}
      <View style={styles.card}>
        <DetailRow label="Finish" value={dip.finish} />
        <DetailRow label="Type" value={dip.type} />
        <DetailRow label="Collection" value={dip.collection} />
        <DetailRow label="Color Code" value={dip.color_code} />
        <DetailRow label="Size" value={dip.size} />
      </View>

      {/* NOTES */}
      {dip.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{dip.notes}</Text>
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.btnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.goldBtn}>
          <Text style={styles.btnText}>★ Favorite</Text>
        </TouchableOpacity>
      </View>

      {/* BACK */}
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/* reusable row */
function DetailRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
  },

  card: {
    backgroundColor: COLORS.soft,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },

  brand: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },

  color: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
  },

  notes: {
    fontSize: 14,
    color: COLORS.primary,
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
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  goldBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  btnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  back: {
    marginTop: 20,
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '500',
  },
});