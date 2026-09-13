import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  FlatList,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { API_BASE } from '../../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../../constants/theme';
import { authFetch } from '../../../../utils/authFetch';

type Vault = {
  id: string;
  name: string;
};

type ProductPhoto = {
  id: string;
  image_url: string;
  order: number;
};

type FormState = {
  name: string;
  brand: string;
  size: string;
  type: string;
  finish: string;
  color_family: string;
  collection_name: string;
  sku: string;
  description: string;
  notes: string;
  purchase_date: string;
  purchase_price: string;
  quantity: string;
  low_stock_threshold: string;
  status: string;
  is_favorite: boolean;
  swatched: boolean;
  is_archived: boolean;
};

const STATUS_OPTIONS = ['active', 'low', 'empty'];
const MAX_PHOTOS = 4;

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    name: '',
    brand: '',
    size: '',
    type: '',
    finish: '',
    color_family: '',
    collection_name: '',
    sku: '',
    description: '',
    notes: '',
    purchase_date: '',
    purchase_price: '',
    quantity: '1',
    low_stock_threshold: '1',
    status: 'active',
    is_favorite: false,
    swatched: false,
    is_archived: false,
  });

  const [photos, setPhotos] = useState<ProductPhoto[]>([]);

  const [selectedVaults, setSelectedVaults] = useState<Vault[]>([]);
  const [allVaults, setAllVaults] = useState<Vault[]>([]);
  const [showVaultModal, setShowVaultModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadVaults = async () => {
      try {
        const res = await authFetch(`${API_BASE}/vaults/`);

        if (res.status === 401) {
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load collections.');
        }

        const data = await res.json();
        setAllVaults(data);
      } catch {
        // Do not block product loading if collections fail.
      }
    };

    loadVaults();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProduct = async () => {
        try {
          setLoading(true);
          setError('');

          const res = await authFetch(
            `${API_BASE}/products/${id}`
          );

          if (res.status === 401) {
            return;
          }

          if (!res.ok) {
            throw new Error('Failed to load product.');
          }

          const p = await res.json();

          setForm({
            name: p.name ?? '',
            brand: p.brand ?? '',
            size: p.size ?? '',
            type: p.type ?? '',
            finish: p.finish ?? '',
            color_family: p.color_family ?? '',
            collection_name: p.collection_name ?? '',
            sku: p.sku ?? '',
            description: p.description ?? '',
            notes: p.notes ?? '',
            purchase_date: p.purchase_date ?? '',
            purchase_price:
              p.purchase_price != null
                ? String(p.purchase_price)
                : '',
            quantity: String(p.quantity ?? 1),
            low_stock_threshold: String(
              p.low_stock_threshold ?? 1
            ),
            status: p.status ?? 'active',
            is_favorite: p.is_favorite ?? false,
            swatched: p.swatched ?? false,
            is_archived: p.is_archived ?? false,
          });

          const loadedPhotos: ProductPhoto[] = Array.isArray(p.photos)
            ? p.photos
            : [];

          setPhotos(
            [...loadedPhotos].sort(
              (a, b) => (a.order ?? 0) - (b.order ?? 0)
            )
          );

          setSelectedVaults(p.vaults ?? []);
        } catch (err: any) {
          setError(
            err.message || 'Failed to load product.'
          );
        } finally {
          setLoading(false);
        }
      };

      loadProduct();
    }, [id])
  );

  const set =
    (field: keyof FormState) =>
    (value: string | boolean) =>
      setForm((prev) => ({
        ...prev,
        [field]: value,
      }));

  const toggleVault = (vault: Vault) => {
    setSelectedVaults((prev) =>
      prev.some((v) => v.id === vault.id)
        ? prev.filter((v) => v.id !== vault.id)
        : [...prev, vault]
    );
  };

  const uploadPhoto = async (
    asset: ImagePicker.ImagePickerAsset
  ) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );
      return;
    }

    try {
      setUploadingPhoto(true);

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

      const fileName =
        asset.fileName ||
        `product-${Date.now()}.${extension}`;

      const localResponse = await fetch(asset.uri);

      if (!localResponse.ok) {
        throw new Error(
          'Could not read the selected photo.'
        );
      }

      const rawBlob = await localResponse.blob();

      const blob = new Blob(
        [rawBlob],
        { type: mimeType }
      );

      const formData = new FormData();

      formData.append(
        'file',
        blob,
        fileName
      );

      const res = await authFetch(
        `${API_BASE}/products/${id}/photos`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (res.status === 401) {
        return;
      }

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        // Keep empty object if the server did not return JSON.
      }

      if (!res.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Failed to upload photo.'
        );
      }

      const newPhoto = data.photo ?? data;

      if (
        newPhoto &&
        newPhoto.id &&
        newPhoto.image_url
      ) {
        setPhotos((prev) =>
          [...prev, newPhoto].sort(
            (a, b) =>
              (a.order ?? 0) - (b.order ?? 0)
          )
        );
      } else {
        const productRes = await authFetch(
          `${API_BASE}/products/${id}`
        );

        if (productRes.ok) {
          const product = await productRes.json();

          const loadedPhotos: ProductPhoto[] =
            Array.isArray(product.photos)
              ? product.photos
              : [];

          setPhotos(
            [...loadedPhotos].sort(
              (a, b) =>
                (a.order ?? 0) - (b.order ?? 0)
            )
          );
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Upload Failed',
        err.message || 'The photo could not be uploaded.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );
      return;
    }

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'DipVault needs camera access to take a product photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      await uploadPhoto(result.assets[0]);
    }
  };

  const choosePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission Needed',
        'DipVault needs photo library access to choose a product photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (
      !result.canceled &&
      result.assets?.length
    ) {
      await uploadPhoto(result.assets[0]);
    }
  };

  const addPhoto = () => {
    if (uploadingPhoto) {
      return;
    }

    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        'Photo Limit',
        'You can add up to 4 photos per product.'
      );
      return;
    }

    const remaining =
      MAX_PHOTOS - photos.length;

    Alert.alert(
      'Add Photo',
      `You can add ${remaining} more ${
        remaining === 1 ? 'photo' : 'photos'
      }.`,
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: choosePhoto,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const deletePhoto = async (photo: ProductPhoto) => {
    try {
      const res = await authFetch(
        `${API_BASE}/products/${id}/photos/${photo.id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.status === 401) {
        return;
      }

      if (!res.ok) {
        let detail = 'Failed to delete photo.';

        try {
          const data = await res.json();

          if (typeof data.detail === 'string') {
            detail = data.detail;
          }
        } catch {
          // Use default message.
        }

        throw new Error(detail);
      }

      setPhotos((prev) =>
        prev
          .filter((p) => p.id !== photo.id)
          .sort(
            (a, b) =>
              (a.order ?? 0) - (b.order ?? 0)
          )
      );
    } catch (err: any) {
      Alert.alert(
        'Delete Failed',
        err.message || 'The photo could not be deleted.'
      );
    }
  };

  const confirmDeletePhoto = (photo: ProductPhoto) => {
    Alert.alert(
      'Delete Photo?',
      photos[0]?.id === photo.id
        ? 'This is the main product photo. If you delete it, the next photo will become the main photo.'
        : 'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePhoto(photo),
        },
      ]
    );
  };

  const handleSave = async () => {
    setError('');

    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }

    try {
      setSaving(true);

      const res = await authFetch(
        `${API_BASE}/products/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: form.name.trim(),
            brand: form.brand.trim() || null,
            size: form.size.trim() || null,
            type: form.type.trim() || null,
            finish: form.finish.trim() || null,
            color_family:
              form.color_family.trim() || null,
            collection_name:
              form.collection_name.trim() || null,
            sku: form.sku.trim() || null,
            description:
              form.description.trim() || null,
            notes: form.notes.trim() || null,
            purchase_date:
              form.purchase_date.trim() || null,
            purchase_price:
              form.purchase_price.trim()
                ? parseFloat(form.purchase_price)
                : null,
            quantity:
              parseInt(form.quantity, 10) || 1,
            low_stock_threshold:
              parseInt(
                form.low_stock_threshold,
                10
              ) || 1,
            status: form.status,
            is_favorite: form.is_favorite,
            swatched: form.swatched,
            is_archived: form.is_archived,
            vault_ids: selectedVaults.map(
              (v) => v.id
            ),
          }),
        }
      );

      if (res.status === 401) {
        return;
      }

      let data: any = {};

      try {
        data = await res.json();
      } catch {
        // Use default error below if needed.
      }

      if (!res.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Failed to save.'
        );
      }

      router.replace(
        `/(app)/product/${id}` as any
      );
    } catch (err: any) {
      setError(
        err.message || 'Something went wrong.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator
            color={COLORS.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          Edit Product
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveBtn}
          disabled={saving}
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

        <View style={styles.card}>
          <View style={styles.photoHeader}>
            <View>
              <Text style={styles.photoSectionTitle}>
                Photos
              </Text>

              <Text style={styles.photoSubtitle}>
                Add up to 4 photos
              </Text>
            </View>

            <Text style={styles.photoCount}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View
                key={photo.id}
                style={styles.photoContainer}
              >
                <Image
                  source={{
                    uri: photo.image_url,
                  }}
                  style={styles.photo}
                  resizeMode="cover"
                />

                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text
                      style={styles.coverBadgeText}
                    >
                      Cover
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deletePhotoBtn}
                  onPress={() =>
                    confirmDeletePhoto(photo)
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={26}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={styles.addPhotoBox}
                onPress={addPhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.75}
              >
                {uploadingPhoto ? (
                  <>
                    <ActivityIndicator
                      color={COLORS.accent}
                    />

                    <Text
                      style={styles.addPhotoText}
                    >
                      Uploading...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={28}
                      color={COLORS.accent}
                    />

                    <Text
                      style={styles.addPhotoText}
                    >
                      Add Photo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {photos.length > 0 && (
            <Text style={styles.photoHint}>
              The first photo is the main product photo.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Basic Info
          </Text>

          <Field
            label="Product Name *"
            value={form.name}
            onChange={set('name')}
          />

          <Field
            label="Brand"
            value={form.brand}
            onChange={set('brand')}
          />

          <Field
            label="Size"
            value={form.size}
            onChange={set('size')}
            placeholder="e.g. 1 oz, 2 oz, 15 ml"
          />

          <Field
            label="Type"
            value={form.type}
            onChange={set('type')}
            placeholder="dip, gel, polish, acrylic…"
          />

          <Field
            label="Finish"
            value={form.finish}
            onChange={set('finish')}
            placeholder="matte, shimmer, glitter…"
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Collections
          </Text>

          <View style={styles.vaultChips}>
            {selectedVaults.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.chip}
                onPress={() => toggleVault(v)}
              >
                <Text style={styles.chipText}>
                  {v.name}
                </Text>

                <Ionicons
                  name="close-circle"
                  size={16}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addVaultBtn}
              onPress={() =>
                setShowVaultModal(true)
              }
            >
              <Ionicons
                name="add"
                size={16}
                color={COLORS.accent}
              />

              <Text style={styles.addVaultText}>
                Add to collection
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Classification
          </Text>

          <Field
            label="Color Family"
            value={form.color_family}
            onChange={set('color_family')}
          />

          <Field
            label="Collection"
            value={form.collection_name}
            onChange={set('collection_name')}
          />

          <Field
            label="SKU"
            value={form.sku}
            onChange={set('sku')}
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Purchase Info
          </Text>

          <Field
            label="Purchase Date"
            value={form.purchase_date}
            onChange={set('purchase_date')}
            placeholder="YYYY-MM-DD"
          />

          <Field
            label="Purchase Price"
            value={form.purchase_price}
            onChange={set('purchase_price')}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Field
            label="Quantity"
            value={form.quantity}
            onChange={set('quantity')}
            keyboardType="number-pad"
          />

          <Field
            label="Low Stock Threshold"
            value={form.low_stock_threshold}
            onChange={set(
              'low_stock_threshold'
            )}
            keyboardType="number-pad"
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Status
          </Text>

          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusChip,
                  form.status === s &&
                    styles.statusChipActive,
                ]}
                onPress={() =>
                  set('status')(s)
                }
              >
                <Text
                  style={[
                    styles.statusChipText,
                    form.status === s &&
                      styles.statusChipTextActive,
                  ]}
                >
                  {s.charAt(0).toUpperCase() +
                    s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Flags
          </Text>

          <ToggleRow
            label="Favorite"
            value={form.is_favorite}
            onChange={set('is_favorite')}
          />

          <View style={styles.divider} />

          <ToggleRow
            label="Swatched"
            value={form.swatched}
            onChange={set('swatched')}
          />

          <View style={styles.divider} />

          <ToggleRow
            label="Archived"
            value={form.is_archived}
            onChange={set('is_archived')}
            last
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Description
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
            ]}
            placeholder="Product description…"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={form.description}
            onChangeText={
              set('description') as (
                v: string
              ) => void
            }
            multiline
          />

          <Text style={styles.sectionTitle}>
            Notes
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { marginBottom: 0 },
            ]}
            placeholder="Personal notes…"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={form.notes}
            onChangeText={
              set('notes') as (
                v: string
              ) => void
            }
            multiline
          />
        </View>
      </ScrollView>

      <Modal
        visible={showVaultModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() =>
          setShowVaultModal(false)
        }
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Collections
            </Text>

            <TouchableOpacity
              onPress={() =>
                setShowVaultModal(false)
              }
            >
              <Ionicons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            data={allVaults}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{
              padding: 20,
              gap: 10,
            }}
            renderItem={({ item }) => {
              const selected =
                selectedVaults.some(
                  (v) => v.id === item.id
                );

              return (
                <TouchableOpacity
                  style={[
                    styles.modalVault,
                    selected &&
                      styles.modalVaultSelected,
                  ]}
                  onPress={() =>
                    toggleVault(item)
                  }
                >
                  <Text
                    style={styles.modalVaultName}
                  >
                    {item.name}
                  </Text>

                  {selected && (
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

          <View style={{ padding: 20 }}>
            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setShowVaultModal(false)
              }
            >
              <Text style={styles.buttonText}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = 'default',
  last = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?:
    | 'default'
    | 'decimal-pad'
    | 'number-pad';
  last?: boolean;
}) {
  return (
    <View
      style={[
        fStyles.wrap,
        !last && fStyles.border,
      ]}
    >
      <Text style={fStyles.label}>
        {label}
      </Text>

      <TextInput
        style={fStyles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? '—'}
        placeholderTextColor={
          COLORS.textSecondary
        }
        keyboardType={keyboardType}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  last = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      style={[
        tStyles.row,
        last && { paddingBottom: 0 },
      ]}
    >
      <Text style={tStyles.label}>
        {label}
      </Text>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: COLORS.border,
          true: COLORS.accent,
        }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
  },

  border: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  input: {
    fontSize: 15,
    color: COLORS.text,
  },
});

const tStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 8,
  },

  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  photoSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
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

  photoContainer: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    position: 'relative',
  },

  photo: {
    width: '100%',
    height: '100%',
  },

  coverBadge: {
    position: 'absolute',
    left: 7,
    bottom: 7,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  coverBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  deletePhotoBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },

  addPhotoBox: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  photoHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 12,
  },

  vaultChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },

  addVaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  addVaultText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 12,
  },

  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },

  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },

  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },

  statusChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },

  statusChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  statusChipTextActive: {
    color: COLORS.white,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
  },

  buttonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
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

  modalVault: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalVaultSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },

  modalVaultName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
});
