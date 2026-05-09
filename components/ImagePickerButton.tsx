import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../constants/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

type Props = {
  uploadUrl: string;   // full path e.g. /products/{id}/image or /formulas/{id}/image
  imageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onDeleteComplete: () => void;
};

export default function ImagePickerButton({
  uploadUrl,
  imageUrl,
  onUploadComplete,
  onDeleteComplete,
}: Props) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);

  const requestAndPick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return null;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return null;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled) return null;
    return result.assets[0];
  };

  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? 'photo.jpg',
      } as any);

      const res = await fetch(`${API_BASE}${uploadUrl}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upload failed');
      onUploadComplete(data.image_url);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message || 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Remove Photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          try {
            await fetch(`${API_BASE}${uploadUrl}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            onDeleteComplete();
          } catch {
            Alert.alert('Error', 'Could not remove image.');
          } finally {
            setUploading(false);
          }
        },
      },
    ]);
  };

  const showPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: imageUrl
            ? ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo']
            : ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: imageUrl ? 3 : undefined,
        },
        async (index) => {
          if (index === 1) { const a = await requestAndPick('camera'); if (a) uploadImage(a); }
          else if (index === 2) { const a = await requestAndPick('library'); if (a) uploadImage(a); }
          else if (index === 3 && imageUrl) handleDelete();
        }
      );
    } else {
      const options: any[] = [
        { text: 'Take Photo', onPress: async () => { const a = await requestAndPick('camera'); if (a) uploadImage(a); } },
        { text: 'Choose from Library', onPress: async () => { const a = await requestAndPick('library'); if (a) uploadImage(a); } },
      ];
      if (imageUrl) options.push({ text: 'Remove Photo', style: 'destructive', onPress: handleDelete });
      options.push({ text: 'Cancel', style: 'cancel' });
      Alert.alert('Photo', 'Choose an option', options);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={showPicker} activeOpacity={0.8} disabled={uploading}>
      {uploading ? (
        <View style={styles.placeholder}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      ) : imageUrl ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={COLORS.white} />
          </View>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="camera-outline" size={32} color={COLORS.textSecondary} />
          <Text style={styles.placeholderText}>Add Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'center', marginBottom: 24 },
  imageWrap: { width: 120, height: 120, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.medium },
  image: { width: 120, height: 120 },
  editBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  placeholder: {
    width: 120, height: 120, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background, borderWidth: 2,
    borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  placeholderText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  uploadingText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
});