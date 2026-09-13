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

import { API_BASE } from '../constants/api';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';
import { authFetch } from '../utils/authFetch';

type Props = {
  uploadUrl: string;
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
  const [uploading, setUploading] = useState(false);

  const requestAndPick = async (
    source: 'camera' | 'library'
  ) => {
    if (source === 'camera') {
      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Camera access is required to take photos.'
        );

        return null;
      }
    } else {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Photo library access is required.'
        );

        return null;
      }
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

    if (
      result.canceled ||
      !result.assets?.length
    ) {
      return null;
    }

    return result.assets[0];
  };

  const uploadImage = async (
    asset: ImagePicker.ImagePickerAsset
  ) => {
    setUploading(true);

    try {
      const fileName =
        asset.fileName ??
        `photo-${Date.now()}.jpg`;

      const mimeType =
        asset.mimeType ??
        'image/jpeg';

      const formData = new FormData();

      formData.append(
        'file',
        {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any
      );

      const fullUrl =
        `${API_BASE}${uploadUrl}`;

      console.log(
        'PHOTO UPLOAD URL:',
        fullUrl
      );

      console.log(
        'PHOTO FILE:',
        {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        }
      );

      const res = await authFetch(
        fullUrl,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log(
        'PHOTO UPLOAD STATUS:',
        res.status
      );

      if (res.status === 401) {
        return;
      }

      const responseText =
        await res.text();

      console.log(
        'PHOTO UPLOAD RESPONSE:',
        responseText
      );

      let data: any = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            `Upload failed (${res.status})`
        );
      }

      if (!data.image_url) {
        throw new Error(
          'Upload succeeded, but no image URL was returned.'
        );
      }

      onUploadComplete(
        data.image_url
      );
    } catch (err: any) {
      console.error(
        'PHOTO UPLOAD ERROR:',
        err
      );

      Alert.alert(
        'Upload failed',
        err?.message ||
          'Could not upload image.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Photo',
      'Remove this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',

          onPress: async () => {
            setUploading(true);

            try {
              const fullUrl =
                `${API_BASE}${uploadUrl}`;

              console.log(
                'PHOTO DELETE URL:',
                fullUrl
              );

              const res =
                await authFetch(
                  fullUrl,
                  {
                    method: 'DELETE',
                  }
                );

              console.log(
                'PHOTO DELETE STATUS:',
                res.status
              );

              if (
                res.status === 401
              ) {
                return;
              }

              if (!res.ok) {
                const responseText =
                  await res.text();

                console.log(
                  'PHOTO DELETE RESPONSE:',
                  responseText
                );

                throw new Error(
                  `Could not remove image (${res.status}).`
                );
              }

              onDeleteComplete();
            } catch (
              err: any
            ) {
              console.error(
                'PHOTO DELETE ERROR:',
                err
              );

              Alert.alert(
                'Error',
                err?.message ||
                  'Could not remove image.'
              );
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const showPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: imageUrl
            ? [
                'Cancel',
                'Take Photo',
                'Choose from Library',
                'Remove Photo',
              ]
            : [
                'Cancel',
                'Take Photo',
                'Choose from Library',
              ],

          cancelButtonIndex: 0,

          destructiveButtonIndex:
            imageUrl
              ? 3
              : undefined,
        },

        async (index) => {
          if (index === 1) {
            const asset =
              await requestAndPick(
                'camera'
              );

            if (asset) {
              await uploadImage(
                asset
              );
            }
          } else if (
            index === 2
          ) {
            const asset =
              await requestAndPick(
                'library'
              );

            if (asset) {
              await uploadImage(
                asset
              );
            }
          } else if (
            index === 3 &&
            imageUrl
          ) {
            handleDelete();
          }
        }
      );
    } else {
      const options: any[] = [
        {
          text: 'Take Photo',

          onPress: async () => {
            const asset =
              await requestAndPick(
                'camera'
              );

            if (asset) {
              await uploadImage(
                asset
              );
            }
          },
        },

        {
          text:
            'Choose from Library',

          onPress: async () => {
            const asset =
              await requestAndPick(
                'library'
              );

            if (asset) {
              await uploadImage(
                asset
              );
            }
          },
        },
      ];

      if (imageUrl) {
        options.push({
          text: 'Remove Photo',
          style: 'destructive',
          onPress: handleDelete,
        });
      }

      options.push({
        text: 'Cancel',
        style: 'cancel',
      });

      Alert.alert(
        'Photo',
        'Choose an option',
        options
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={showPicker}
      activeOpacity={0.8}
      disabled={uploading}
    >
      {uploading ? (
        <View
          style={
            styles.placeholder
          }
        >
          <ActivityIndicator
            color={COLORS.accent}
          />

          <Text
            style={
              styles.uploadingText
            }
          >
            Uploading…
          </Text>
        </View>
      ) : imageUrl ? (
        <View
          style={
            styles.imageWrap
          }
        >
          <Image
            source={{
              uri: imageUrl,
            }}
            style={styles.image}
            resizeMode="cover"
          />

          <View
            style={
              styles.editBadge
            }
          >
            <Ionicons
              name="camera"
              size={14}
              color={
                COLORS.white
              }
            />
          </View>
        </View>
      ) : (
        <View
          style={
            styles.placeholder
          }
        >
          <Ionicons
            name="camera-outline"
            size={32}
            color={
              COLORS.textSecondary
            }
          />

          <Text
            style={
              styles.placeholderText
            }
          >
            Add Photo
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: 24,
  },

  imageWrap: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.medium,
  },

  image: {
    width: 120,
    height: 120,
  },

  editBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor:
      COLORS.accent,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  placeholder: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    backgroundColor:
      COLORS.background,
    borderWidth: 2,
    borderColor:
      COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 6,
  },

  placeholderText: {
    fontSize: 13,
    color:
      COLORS.textSecondary,
    fontWeight: '600',
  },

  uploadingText: {
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 6,
  },
});
