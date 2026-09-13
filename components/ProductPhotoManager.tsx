import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE } from '../constants/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import { authFetch } from '../utils/authFetch';

export type ProductPhoto = {
  id: string;
  image_url: string;
  order: number;
};

type Props = {
  productId: string;
  photos: ProductPhoto[];
  onPhotosChange: (photos: ProductPhoto[]) => void;
  maxPhotos?: number;
};

export default function ProductPhotoManager({
  productId,
  photos,
  onPhotosChange,
  maxPhotos = 4,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const remainingSlots = maxPhotos - photos.length;

  const pickAndUpload = async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Limit reached', `You can add up to ${maxPhotos} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    const updated = [...photos];

    for (const asset of result.assets) {
      try {
        const fileName = asset.fileName ?? `photo-${Date.now()}.jpg`;
        const mimeType = asset.mimeType ?? 'image/jpeg';

        const formData = new FormData();
        formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any);

        const res = await authFetch(`${API_BASE}/products/${productId}/photos`, {
          method: 'POST',
          body: formData,
        });

        if (res.status === 401) { setUploading(false); return; }

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) throw new Error(data?.detail || `Upload failed (${res.status})`);

        updated.push({ id: data.id, image_url: data.image_url, order: data.order });
      } catch (err: any) {
        Alert.alert('Upload failed', err?.message || `Could not upload ${asset.fileName ?? 'an image'}.`);
      }
    }

    onPhotosChange(updated);
    setUploading(false);
  };

  const handleDelete = (photo: ProductPhoto) => {
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await authFetch(`${API_BASE}/products/${productId}/photos/${photo.id}`, {
              method: 'DELETE',
            });
            if (res.status === 401) return;
            if (!res.ok) throw new Error(`Could not remove photo (${res.status}).`);
            onPhotosChange(photos.filter((p) => p.id !== photo.id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not remove photo.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.row}>
      {photos.map((photo) => (
        <TouchableOpacity key={photo.id} style={styles.slot} onLongPress={() => handleDelete(photo)}>
          <Image source={{ uri: photo.image_url }} style={styles.image} resizeMode="cover" />
        </TouchableOpacity>
      ))}

      {remainingSlots > 0 && (
        <TouchableOpacity style={styles.placeholder} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color={COLORS.textSecondary} />
              <Text style={styles.placeholderText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slot: { width: 80, height: 80, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.medium },
  image: { width: 80, height: 80 },
  placeholder: {
    width: 80, height: 80, borderRadius: RADIUS.lg, backgroundColor: COLORS.background,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  placeholderText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
});
