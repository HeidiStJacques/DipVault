import { Redirect, Stack } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}