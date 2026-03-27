import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, THEME } from '../constants/theme';

const mockLooks = [
  {
    id: '1',
    title: 'Mod About Me',
    date: '2026-03-01',
    image: require('../assets/images/Mod_About_Me.jpg'),
  },
  {
    id: '2',
    title: 'Peaches And Cream',
    date: '2026-02-20',
    image: require('../assets/images/Peaches_and_Cream.jpg'),
  },
];

export default function LookbookScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Look Book</Text>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/add-look' as any)}
        >
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={mockLooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: THEME.spacing.md,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },

  addBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
  },

  addText: {
    color: '#fff',
    fontWeight: '600',
  },

  card: {
    marginBottom: 15,
  },

  image: {
    width: '100%',
    height: 180,
    borderRadius: THEME.radius.md,
  },

  cardTitle: {
    marginTop: 6,
    fontWeight: '600',
    color: COLORS.primary,
  },

  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});