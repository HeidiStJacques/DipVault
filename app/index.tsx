import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { COLORS, THEME } from '../constants/theme';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/dashboard' as any);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>DipVault</Text>

      {/* EMAIL */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />

      {/* PASSWORD */}
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      {/* LOGIN BUTTON */}
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* SIGN UP */}
      <TouchableOpacity onPress={() => router.push('/signup' as any)}>
        <Text style={styles.signup}>Create Account</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: THEME.spacing.lg,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 30,
    textAlign: 'center',
  },

  input: {
    backgroundColor: COLORS.soft,
    padding: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 12,
  },

  loginBtn: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: THEME.radius.md,
    marginTop: 10,
  },

  loginText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },

  signup: {
    marginTop: 15,
    textAlign: 'center',
    color: COLORS.primary,
  },
});