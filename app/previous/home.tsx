import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, THEME } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    // TODO: later clear FastAPI auth tokens/context here
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DipVault</Text>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings')}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={COLORS.gold}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <HomeCard
          title="Collection"
          icon={require('../assets/icons/collection.png')}
          onPress={() => router.push('/collection')}
        />

        <HomeCard
          title="Look Book"
          icon={require('../assets/icons/nail.png')}
          onPress={() => router.push('/lookbook')}
        />

        <HomeCard
          title="Add Product"
          icon={require('../assets/icons/plus.png')}
          onPress={() => router.push('/add-product')}
        />

        <HomeCard
          title="Favorites"
          icon={require('../assets/icons/heart.png')}
          onPress={() => router.push('/favorites')}
        />

        <HomeCard
          title="Formulas"
          icon={require('../assets/icons/experiment.png')}
          onPress={() => router.push('/formulas')}
        />

        <HomeCard
          title="Tools"
          icon={require('../assets/icons/tools.png')}
          onPress={() => router.push('/tools')}
        />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

type HomeCardProps = {
  title: string;
  icon: any;
  onPress: () => void;
};

function HomeCard({ title, icon, onPress }: HomeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image source={icon} style={styles.icon} />
      <Text style={styles.cardText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F7ED',
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },

  title: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 1,
  },

  settingsBtn: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  icon: {
    width: 32,
    height: 32,
    marginBottom: 10,
  },

  cardText: {
    color: COLORS.gold,
    fontWeight: '600',
    fontSize: 14,
  },

  logoutBtn: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  logoutText: {
    color: COLORS.gold,
    fontWeight: '600',
    fontSize: 15,
  },
});