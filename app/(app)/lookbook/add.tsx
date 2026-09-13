import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE } from '../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../constants/theme';
import { authFetch } from '../../../utils/authFetch';

type Product = {
  id: string;
  name: string;
  brand?: string;
};

type SelectedProduct = {
  product_id?: string;
  name_override?: string;
  display_name: string;
};

type PendingPhoto = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export default function AddLookScreen() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState<
    SelectedProduct[]
  >([]);

  const [manualEntry, setManualEntry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Product picker modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Photos stored locally until the look is created
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>(
    []
  );

  const fetchProducts = async () => {
    setLoadingProducts(true);

    try {
      const res = await authFetch(`${API_BASE}/products/`);

      if (res.status === 401) {
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load products.');
      }

      const data = await res.json();
      setAllProducts(data);
    } catch (err: any) {
      setError(
        err.message || 'Failed to load products.'
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const pickPhoto = async (
    source: 'camera' | 'library'
  ) => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'DipVault needs camera permission to take a photo.'
          : 'DipVault needs photo library permission to choose a photo.'
      );

      return;
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
            allowsEditing: false,
            quality: 0.8,
            allowsMultipleSelection: true,
          });

    if (result.canceled) {
      return;
    }

    const assets = result.assets ?? [];

    setPendingPhotos((prev) => [
      ...prev,
      ...assets.map((asset) => ({
        uri: asset.uri,
        mimeType:
          asset.mimeType ?? 'image/jpeg',
        fileName:
          asset.fileName ??
          `look-${Date.now()}.jpg`,
      })),
    ]);
  };

  const addManualProduct = () => {
    if (!manualEntry.trim()) {
      return;
    }

    setSelectedProducts((prev) => [
      ...prev,
      {
        name_override: manualEntry.trim(),
        display_name: manualEntry.trim(),
      },
    ]);

    setManualEntry('');
  };

  const removeProduct = (index: number) => {
    setSelectedProducts((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const removePhoto = (index: number) => {
    setPendingPhotos((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const uploadPhoto = async (
    lookId: string,
    photo: PendingPhoto
  ) => {
    const localResponse = await fetch(photo.uri);

    if (!localResponse.ok) {
      throw new Error(
        'Could not read one of the selected photos.'
      );
    }

    const blob = await localResponse.blob();

    const formData = new FormData();

    formData.append(
      'file',
      blob,
      photo.fileName
    );

    const photoRes = await authFetch(
      `${API_BASE}/looks/${lookId}/photos`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (photoRes.status === 401) {
      return false;
    }

    if (!photoRes.ok) {
      let detail =
        'The look was created, but one or more photos could not be uploaded.';

      try {
        const data = await photoRes.json();

        if (typeof data.detail === 'string') {
          detail = data.detail;
        }
      } catch {
        // Keep default message.
      }

      throw new Error(detail);
    }

    return true;
  };

  const handleSave = async () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      setSaving(true);

      // 1. Create look
      const res = await authFetch(
        `${API_BASE}/looks/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            notes: notes.trim() || null,
            is_favorite: isFavorite,
            products: selectedProducts.map(
              (product) => ({
                product_id:
                  product.product_id ?? null,
                name_override:
                  product.name_override ?? null,
              })
            ),
          }),
        }
      );

      if (res.status === 401) {
        return;
      }

      const responseText =
        await res.text();

      let look: any = {};

      try {
        look = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        throw new Error(
          responseText ||
            'The server returned an invalid response.'
        );
      }

      if (!res.ok) {
        throw new Error(
          typeof look.detail === 'string'
            ? look.detail
            : 'Failed to create look.'
        );
      }

      if (!look.id) {
        throw new Error(
          'The look was created, but the server did not return a look ID.'
        );
      }

      // 2. Upload photos
      for (const photo of pendingPhotos) {
        const completed =
          await uploadPhoto(
            look.id,
            photo
          );

        if (!completed) {
          return;
        }
      }

      router.replace('/(app)/lookbook/' as any);
    } catch (err: any) {
      setError(
        err.message || 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={COLORS.text}
          />
        </TouchableOpacity>

        <Text style={styles.title}>
          New Look
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color={COLORS.accent}
            />
          ) : (
            <Text style={styles.saveBtnText}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Details
          </Text>

          <Text style={styles.label}>
            Title *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Summer Coral Ombre"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>
            Notes
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Technique, occasion, thoughts…"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={styles.favoriteRow}
            onPress={() =>
              setIsFavorite(
                (current) => !current
              )
            }
          >
            <Ionicons
              name={
                isFavorite
                  ? 'heart'
                  : 'heart-outline'
              }
              size={22}
              color={COLORS.accent}
            />

            <Text
              style={styles.favoriteLabel}
            >
              Mark as favorite
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Photos
          </Text>

          <View style={styles.photoGrid}>
            {pendingPhotos.map(
              (photo, index) => (
                <View
                  key={`${photo.uri}-${index}`}
                  style={styles.photoThumb}
                >
                  <Image
                    source={{
                      uri: photo.uri,
                    }}
                    style={
                      styles.photoImage
                    }
                    resizeMode="cover"
                  />

                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() =>
                      removePhoto(index)
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              )
            )}

            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={() =>
                Alert.alert(
                  'Add Photo',
                  '',
                  [
                    {
                      text: 'Take Photo',
                      onPress: () =>
                        pickPhoto('camera'),
                    },
                    {
                      text:
                        'Choose from Library',
                      onPress: () =>
                        pickPhoto('library'),
                    },
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                  ]
                )
              }
            >
              <Ionicons
                name="camera-outline"
                size={28}
                color={COLORS.textSecondary}
              />

              <Text
                style={styles.addPhotoText}
              >
                Add Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Products Used
          </Text>

          {selectedProducts.map(
            (product, index) => (
              <View
                key={`${product.display_name}-${index}`}
                style={styles.productChip}
              >
                <Text
                  style={
                    styles.productChipText
                  }
                  numberOfLines={1}
                >
                  {product.display_name}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    removeProduct(index)
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={
                      COLORS.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>
            )
          )}

          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => {
              fetchProducts();
              setShowProductModal(true);
            }}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={COLORS.accent}
            />

            <Text style={styles.pickBtnText}>
              Pick from my products
            </Text>
          </TouchableOpacity>

          <View style={styles.manualRow}>
            <TextInput
              style={[
                styles.input,
                styles.manualInput,
              ]}
              placeholder="Or type a product name…"
              placeholderTextColor={
                COLORS.textSecondary
              }
              value={manualEntry}
              onChangeText={setManualEntry}
              onSubmitEditing={
                addManualProduct
              }
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.manualAdd}
              onPress={addManualProduct}
            >
              <Ionicons
                name="add"
                size={22}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Product Picker */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setShowProductModal(false)
        }
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              My Products
            </Text>

            <TouchableOpacity
              onPress={() =>
                setShowProductModal(false)
              }
            >
              <Ionicons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          {loadingProducts ? (
            <View style={styles.centered}>
              <ActivityIndicator
                color={COLORS.accent}
              />
            </View>
          ) : (
            <FlatList
              data={allProducts}
              keyExtractor={(product) =>
                product.id
              }
              contentContainerStyle={{
                padding: 20,
                gap: 10,
              }}
              renderItem={({ item }) => {
                const already =
                  selectedProducts.some(
                    (selected) =>
                      selected.product_id ===
                      item.id
                  );

                return (
                  <TouchableOpacity
                    style={[
                      styles.modalProduct,
                      already &&
                        styles.modalProductSelected,
                    ]}
                    onPress={() => {
                      if (!already) {
                        setSelectedProducts(
                          (prev) => [
                            ...prev,
                            {
                              product_id:
                                item.id,
                              display_name:
                                item.brand
                                  ? `${item.brand} ${item.name}`
                                  : item.name,
                            },
                          ]
                        );
                      }

                      setShowProductModal(
                        false
                      );
                    }}
                  >
                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.modalProductName
                        }
                      >
                        {item.name}
                      </Text>

                      {item.brand ? (
                        <Text
                          style={
                            styles.modalProductBrand
                          }
                        >
                          {item.brand}
                        </Text>
                      ) : null}
                    </View>

                    {already && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },

  backBtn: {
    padding: 4,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  saveBtn: {
    minWidth: 40,
    alignItems: 'flex-end',
  },

  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 14,
  },

  error: {
    color: COLORS.error,
    fontSize: 13,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    ...SHADOW.small,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
  },

  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },

  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  favoriteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.accentSoft,
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    backgroundColor: COLORS.white,
    borderRadius: 11,
  },

  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  addPhotoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },

  productChipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 10,
  },

  pickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },

  manualRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  manualInput: {
    flex: 1,
    marginBottom: 0,
  },

  manualAdd: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },

  modalProduct: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalProductSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },

  modalProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  modalProductBrand: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
