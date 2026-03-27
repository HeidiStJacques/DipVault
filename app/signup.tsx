import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { COLORS, THEME } from '../constants/theme';

export default function SignupScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please log in.');
      router.replace('/');
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Create Account</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.text}>Sign Up</Text>
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
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },

  input: {
    backgroundColor: COLORS.soft,
    padding: 12,
    borderRadius: THEME.radius.md,
    marginBottom: 12,
  },

  button: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: THEME.radius.md,
  },

  text: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});