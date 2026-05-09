import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../../context/AuthContext';
import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';

export default function AddProductScreen() {
  const { token } = useAuth();

  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [collection, setCollection] = useState('');
  const [colorFamily, setColorFamily] = useState('');
  const [finish, setFinish] = useState('');
  const [type, setType] = useState('');
  const [swatched, setSwatched] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if (!company.trim()) {
      setError('Company is required.');
      return;
    }

    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/products/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company: company.trim(),

          // Required by backend
          name: name.trim(),

          size: size.trim(),
          collection: collection.trim(),
          color_family: colorFamily.trim(),
          finish: finish.trim(),
          type: type.trim(),
          swatched,
          notes: notes.trim(),
        }),
      });

      // Read response safely in case server returns HTML instead of JSON
      const responseText = await response.text();

      let data: any = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = {
          detail:
            responseText || 'Server returned an invalid response.',
        };
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : JSON.stringify(data.detail || data)
        );
      }

      // Return to previous screen after successful save
      router.back();
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    setter: (text: string) => void,
    placeholder: string,
    multiline = false
  ) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={setter}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>

          <Text style={styles.title}>Add Product</Text>

          <View style={{ width: 32 }} />
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}

            {renderInput(
              'Company',
              company,
              setCompany,
              'e.g. Kiara Sky'
            )}

            {renderInput(
              'Product Name',
              name,
              setName,
              'e.g. High Maintenance'
            )}

            {renderInput(
              'Size',
              size,
              setSize,
              'e.g. 2 oz'
            )}

            {renderInput(
              'Collection',
              collection,
              setCollection,
              'e.g. Summer Collection'
            )}

            {renderInput(
              'Color Family',
              colorFamily,
              setColorFamily,
              'e.g. Pink'
            )}

            {renderInput(
              'Finish',
              finish,
              setFinish,
              'e.g. Glitter'
            )}

            {renderInput(
              'Type',
              type,
              setType,
              'e.g. Dip Powder'
            )}

            {/* Swatched */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Swatched</Text>
              <Switch
                value={swatched}
                onValueChange={setSwatched}
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.accent,
                }}
                thumbColor={COLORS.white}
              />
            </View>

            {renderInput(
              'Notes',
              notes,
              setNotes,
              'Additional notes...',
              true
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>
                  Save Product
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  flex: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },

  backButton: {
    width: 32,
    alignItems: 'flex-start',
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.medium,
  },

  error: {
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 18,
  },

  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 4,
  },

  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});