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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE } from '../../../constants/api';
import {
  COLORS,
  RADIUS,
  SHADOW,
} from '../../../constants/theme';
import { authFetch } from '../../../utils/authFetch';

type PendingPhoto = {
  uri: string;
  mimeType: string;
  fileName: string;
};

const MAX_PHOTOS = 4;

export default function AddProductScreen() {
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [collectionName, setCollectionName] =
    useState('');
  const [colorFamily, setColorFamily] =
    useState('');
  const [finish, setFinish] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] =
    useState('');
  const [notes, setNotes] = useState('');
  const [swatched, setSwatched] =
    useState(false);

  const [
    pendingPhotos,
    setPendingPhotos,
  ] = useState<PendingPhoto[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const addPhotoAsset = (
    asset: ImagePicker.ImagePickerAsset
  ) => {
    if (
      pendingPhotos.length >= MAX_PHOTOS
    ) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );

      return;
    }

    const extension =
      asset.uri.split('.').pop()?.toLowerCase() || 'jpg';

    const extensionMimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
        ? 'image/webp'
        : extension === 'heic'
        ? 'image/heic'
        : extension === 'jpg' || extension === 'jpeg'
        ? 'image/jpeg'
        : undefined;

    const normalizedAssetMimeType =
      asset.mimeType === 'image/jpg'
        ? 'image/jpeg'
        : asset.mimeType;

    const mimeType =
      extensionMimeType ||
      normalizedAssetMimeType ||
      'image/jpeg';

    setPendingPhotos((prev) => [
      ...prev,
      {
        uri: asset.uri,
        mimeType,
        fileName:
          asset.fileName ??
          `product-${
            prev.length + 1
          }.${extension}`,
      },
    ]);
  };

  const takePhoto = async () => {
    if (
      pendingPhotos.length >= MAX_PHOTOS
    ) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );

      return;
    }

    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'DipVault needs camera access to take a product photo.'
      );

      return;
    }

    const result =
      await ImagePicker
        .launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      addPhotoAsset(
        result.assets[0]
      );
    }
  };

  const choosePhoto = async () => {
    if (
      pendingPhotos.length >= MAX_PHOTOS
    ) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );

      return;
    }

    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'DipVault needs photo library access to choose a product photo.'
      );

      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      addPhotoAsset(
        result.assets[0]
      );
    }
  };

  const pickPhoto = () => {
    if (
      pendingPhotos.length >= MAX_PHOTOS
    ) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );

      return;
    }

    const remaining =
      MAX_PHOTOS -
      pendingPhotos.length;

    Alert.alert(
      'Add Photo',
      `You can add ${remaining} more ${
        remaining === 1
          ? 'photo'
          : 'photos'
      }.`,
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text:
            'Choose from Library',
          onPress: choosePhoto,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const removePhoto = (
    index: number
  ) => {
    setPendingPhotos((prev) =>
      prev.filter(
        (_, photoIndex) =>
          photoIndex !== index
      )
    );
  };

  const uploadPhotos = async (
    productId: string
  ) => {
    for (
      const photo of pendingPhotos
    ) {
      const localResponse =
        await fetch(photo.uri);

      if (!localResponse.ok) {
        throw new Error(
          'Could not read one of the selected photos.'
        );
      }

      const rawBlob =
        await localResponse.blob();

      const blob = new Blob(
        [rawBlob],
        { type: photo.mimeType }
      );

      const formData =
        new FormData();

      formData.append(
        'file',
        blob,
        photo.fileName
      );

      const response =
        await authFetch(
          `${API_BASE}/products/${productId}/photos`,
          {
            method: 'POST',
            body: formData,
          }
        );

      if (
        response.status === 401
      ) {
        return false;
      }

      if (!response.ok) {
        let detail =
          'One of the photos could not be uploaded.';

        try {
          const data =
            await response.json();

          if (
            typeof data.detail ===
            'string'
          ) {
            detail = data.detail;
          }
        } catch {
          // Keep default message.
        }

        throw new Error(detail);
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError('');

    if (!name.trim()) {
      setError(
        'Product Name is required.'
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * Create the product first so
       * we have the product ID before
       * uploading its photos.
       */
      const response =
        await authFetch(
          `${API_BASE}/products/`,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              name: name.trim(),

              brand:
                brand.trim() ||
                null,

              size:
                size.trim() ||
                null,

              collection_name:
                collectionName.trim() ||
                null,

              color_family:
                colorFamily.trim() ||
                null,

              finish:
                finish.trim() ||
                null,

              type:
                type.trim() ||
                null,

              description:
                description.trim() ||
                null,

              notes:
                notes.trim() ||
                null,

              swatched,
            }),
          }
        );

      if (
        response.status === 401
      ) {
        return;
      }

      const responseText =
        await response.text();

      let product: any = {};

      try {
        product =
          responseText
            ? JSON.parse(
                responseText
              )
            : {};
      } catch {
        throw new Error(
          responseText ||
            'The server returned an invalid response.'
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof product.detail ===
          'string'
            ? product.detail
            : JSON.stringify(
                product.detail ||
                  product
              )
        );
      }

      if (!product.id) {
        throw new Error(
          'The product was created, but the server did not return a product ID.'
        );
      }

      /*
       * Upload selected photos.
       */
      if (
        pendingPhotos.length > 0
      ) {
        try {
          const completed =
            await uploadPhotos(
              product.id
            );

          if (!completed) {
            return;
          }
        } catch (
          photoError: any
        ) {
          Alert.alert(
            'Product Saved',
            photoError?.message ||
              'The product was saved, but one or more photos could not be uploaded.'
          );
        }
      }

      /*
       * Return to My Collection.
       */
      router.replace(
        '/(app)/collection/' as any
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label: string,
    value: string,
    setter: (
      text: string
    ) => void,
    placeholder: string,
    multiline = false
  ) => (
    <>
      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          multiline &&
            styles.textArea,
        ]}
        placeholder={
          placeholder
        }
        placeholderTextColor={
          COLORS.textSecondary
        }
        value={value}
        onChangeText={setter}
        multiline={multiline}
        numberOfLines={
          multiline ? 4 : 1
        }
      />
    </>
  );

  return (
    <SafeAreaView
      style={styles.safe}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            style={
              styles.backButton
            }
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={
                COLORS.text
              }
            />
          </TouchableOpacity>

          <Text
            style={styles.title}
          >
            Add Product
          </Text>

          <View
            style={{
              width: 32,
            }}
          />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* Photos */}

          <View
            style={
              styles.photoCard
            }
          >
            <View
              style={
                styles.photoHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.photoTitle
                  }
                >
                  Photos
                </Text>

                <Text
                  style={
                    styles.photoSubtitle
                  }
                >
                  Add up to 4
                  photos
                </Text>
              </View>

              <Text
                style={
                  styles.photoCount
                }
              >
                {
                  pendingPhotos.length
                }
                /4
              </Text>
            </View>

            <View
              style={
                styles.photoGrid
              }
            >
              {pendingPhotos.map(
                (
                  photo,
                  index
                ) => (
                  <View
                    key={`${photo.uri}-${index}`}
                    style={
                      styles.photoWrap
                    }
                  >
                    <Image
                      source={{
                        uri: photo.uri,
                      }}
                      style={
                        styles.photo
                      }
                      resizeMode="cover"
                    />

                    {index ===
                      0 && (
                      <View
                        style={
                          styles.coverBadge
                        }
                      >
                        <Text
                          style={
                            styles.coverBadgeText
                          }
                        >
                          Cover
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={
                        styles.removePhotoButton
                      }
                      onPress={() =>
                        removePhoto(
                          index
                        )
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={24}
                        color={
                          COLORS.error
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )
              )}

              {pendingPhotos.length <
                MAX_PHOTOS && (
                <TouchableOpacity
                  style={
                    styles.photoPlaceholder
                  }
                  onPress={
                    pickPhoto
                  }
                  activeOpacity={
                    0.8
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={28}
                    color={
                      COLORS.textSecondary
                    }
                  />

                  <Text
                    style={
                      styles.photoPlaceholderText
                    }
                  >
                    Add Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {pendingPhotos.length >
              0 && (
              <Text
                style={
                  styles.coverHint
                }
              >
                The first photo
                will be used as
                the main product
                photo.
              </Text>
            )}
          </View>

          <View
            style={styles.card}
          >
            {error ? (
              <Text
                style={
                  styles.error
                }
              >
                {error}
              </Text>
            ) : null}

            {renderInput(
              'Product Name *',
              name,
              setName,
              'e.g. High Maintenance'
            )}

            {renderInput(
              'Brand',
              brand,
              setBrand,
              'e.g. Kiara Sky'
            )}

            {renderInput(
              'Size',
              size,
              setSize,
              'e.g. 2 oz'
            )}

            {renderInput(
              'Collection',
              collectionName,
              setCollectionName,
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

            {renderInput(
              'Description',
              description,
              setDescription,
              'Product description...',
              true
            )}

            <View
              style={
                styles.switchRow
              }
            >
              <Text
                style={
                  styles.switchLabel
                }
              >
                Swatched
              </Text>

              <Switch
                value={swatched}
                onValueChange={
                  setSwatched
                }
                trackColor={{
                  false:
                    COLORS.border,
                  true:
                    COLORS.accent,
                }}
                thumbColor={
                  COLORS.white
                }
              />
            </View>

            {renderInput(
              'Notes',
              notes,
              setNotes,
              'Personal notes...',
              true
            )}

            <TouchableOpacity
              style={
                styles.button
              }
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  color={
                    COLORS.white
                  }
                />
              ) : (
                <Text
                  style={
                    styles.buttonText
                  }
                >
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

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        COLORS.background,
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
      gap: 16,
    },

    photoCard: {
      backgroundColor:
        COLORS.card,
      borderRadius:
        RADIUS.xl,
      padding: 20,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      ...SHADOW.medium,
    },

    photoHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },

    photoTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.text,
    },

    photoSubtitle: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
      marginTop: 2,
    },

    photoCount: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.accent,
    },

    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    photoWrap: {
      width: '47%',
      aspectRatio: 1,
      borderRadius:
        RADIUS.lg,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor:
        COLORS.background,
    },

    photo: {
      width: '100%',
      height: '100%',
    },

    coverBadge: {
      position: 'absolute',
      left: 7,
      bottom: 7,
      backgroundColor:
        COLORS.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },

    coverBadgeText: {
      color: COLORS.white,
      fontSize: 10,
      fontWeight: '700',
    },

    removePhotoButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor:
        COLORS.white,
      borderRadius: 12,
    },

    photoPlaceholder: {
      width: '47%',
      aspectRatio: 1,
      borderRadius:
        RADIUS.lg,
      borderWidth: 2,
      borderColor:
        COLORS.border,
      borderStyle: 'dashed',
      backgroundColor:
        COLORS.background,
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 6,
    },

    photoPlaceholderText: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
      fontWeight: '600',
    },

    coverHint: {
      fontSize: 11,
      color:
        COLORS.textSecondary,
      marginTop: 12,
    },

    card: {
      backgroundColor:
        COLORS.card,
      borderRadius:
        RADIUS.xl,
      padding: 24,
      borderWidth: 1,
      borderColor:
        COLORS.border,
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
      color:
        COLORS.textSecondary,
      marginBottom: 6,
    },

    input: {
      backgroundColor:
        COLORS.background,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 15,
      color: COLORS.text,
      marginBottom: 18,
    },

    textArea: {
      height: 100,
      textAlignVertical:
        'top',
    },

    switchRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
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
      backgroundColor:
        COLORS.accent,
      borderRadius:
        RADIUS.md,
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
