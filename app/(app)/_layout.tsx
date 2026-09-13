import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/theme';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
