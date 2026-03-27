import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { COLORS, THEME } from '../constants/theme';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Dashboard</Text>

      <View style={styles.grid}>

        <HomeCard
          title="Collection"
          icon={<Image source={require('../assets/icons/collection.png')} style={styles.icon} />}
          onPress={() => router.push('/dips')}
        />

        <HomeCard
          title="Look Book"
          icon={<Image source={require('../assets/icons/nail.png')} style={styles.icon} />}
          onPress={() => router.push('/lookbook' as any)}
        />

        <HomeCard
          title="Add Dip"
          icon={<Image source={require('../assets/icons/plus.png')} style={styles.icon} />}
          onPress={() => router.push('/add-dip')}
        />

        <HomeCard
          title="Favorites"
          icon={<Image source={require('../assets/icons/heart.png')} style={styles.icon} />}
          onPress={() => router.push('/favorites' as any)}
        />

      </View>

      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/');
        }}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </View>
  );
}

function HomeCard({ title, icon, onPress }: any) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {icon}
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: THEME.spacing.md,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 20,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: COLORS.soft,
    padding: 16,
    borderRadius: THEME.radius.md,
    marginBottom: 12,
    alignItems: 'center',
  },

  icon: {
    width: 28,
    height: 28,
    marginBottom: 8,
  },

  cardText: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  logoutBtn: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.soft,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },

  logoutText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});