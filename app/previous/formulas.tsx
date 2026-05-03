import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

export default function FormulasScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.homeText}>🏠</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Formulas</Text>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-product')}
        >
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Formulas</Text>
        <Text style={styles.subtitle}>No formulas yet</Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  homeBtn: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  homeText: {
    fontSize: 16,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },

  addBtn: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  addText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.6,
  },
});