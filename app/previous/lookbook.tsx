import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LookbookScreen() {
  const router = useRouter();

  const data: any[] = [];

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
      <TouchableOpacity
        style={styles.homeContainer}
        onPress={() => router.push('/dashboard')}
      >
      <Text style={styles.home}>🏠</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Look Book</Text>

    <TouchableOpacity
      style={styles.addBtn}
      onPress={() => router.push('/add-product')}
    >
      <Text style={styles.addText}>＋</Text>
    </TouchableOpacity>
    </View>

      {/* CONTENT */}
      {data.length === 0 ? (
        <Text style={styles.empty}>No looks yet</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => (
            <Image source={{ uri: item.image }} style={styles.image} />
          )}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  homeButton: {
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  plus: {
    fontSize: 28,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 50,
    color: COLORS.text,
    opacity: 0.6,
  },
  image: {
    width: '48%',
    height: 150,
    borderRadius: 12,
    marginBottom: 10,
  },

  homeContainer: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  home: {
    fontSize: 16,
  },

  addBtn: {
    backgroundColor: COLORS.card,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  addText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },
});