import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, THEME } from "../../constants/theme";

export default function SettingsScreen() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userId");
    router.replace("/login");
  };

  const handleResetApp = async () => {
    Alert.alert("Reset App", "This will clear all local data. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* USER INFO */}
      <View style={styles.card}>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>{userId || "Not logged in"}</Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/collection")}
        >
          <Text style={styles.buttonText}>My Collection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/add-product")}
        >
          <Text style={styles.buttonText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* DANGER ZONE */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetApp}>
          <Text style={styles.resetText}>Reset App</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: THEME.spacing.lg,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.accent,
    marginBottom: 20,
  },

  card: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: THEME.radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  label: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  value: {
    color: COLORS.text,
    fontWeight: "600",
  },

  button: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  buttonText: {
    color: COLORS.accent,
    fontWeight: "600",
  },

  logoutBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },

  logoutText: {
    color: COLORS.accent,
    fontWeight: "700",
  },

  resetBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },

  resetText: {
    color: "red",
    fontWeight: "600",
  },
});
