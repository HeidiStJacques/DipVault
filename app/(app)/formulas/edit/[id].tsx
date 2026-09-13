import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE } from '../../../../constants/api';
import { COLORS, RADIUS, SHADOW } from '../../../../constants/theme';
import ImagePickerButton from '../../../../components/ImagePickerButton';
import { authFetch } from '../../../../utils/authFetch';

type Product = {
  id: string;
  name: string;
  brand?: string;
};

type Ingredient = {
  product_id?: string;
  name_override?: string;
  display_name: string;
  measurement: string;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() =>
            onChange(star === value ? 0 : star)
          }
        >
          <Ionicons
            name={
              star <= value
                ? 'star'
                : 'star-outline'
            }
            size={32}
            color={COLORS.accent}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function EditFormulaScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [starRating, setStarRating] = useState(0);

  const [imageUrl, setImageUrl] =
    useState<string | null>(null);

  const [ingredients, setIngredients] =
    useState<Ingredient[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [manualName, setManualName] = useState('');
  const [manualMeasurement, setManualMeasurement] =
    useState('');

  const [showProductModal, setShowProductModal] =
    useState(false);

  const [allProducts, setAllProducts] =
    useState<Product[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(false);

  const [pendingProductId, setPendingProductId] =
    useState<string | null>(null);

  const [pendingProductName, setPendingProductName] =
    useState('');

  const [pendingMeasurement, setPendingMeasurement] =
    useState('');

  useFocusEffect(
    useCallback(() => {
      const loadFormula = async () => {
        try {
          setLoading(true);
          setError('');

          const res = await authFetch(
            `${API_BASE}/formulas/${id}`
          );

          if (res.status === 401) {
            return;
          }

          if (!res.ok) {
            throw new Error(
              'Failed to load formula.'
            );
          }

          const formula = await res.json();

          setTitle(formula.title ?? '');
          setNotes(formula.notes ?? '');
          setStarRating(
            formula.star_rating ?? 0
          );
          setImageUrl(
            formula.image_url ?? null
          );

          setIngredients(
            (formula.ingredients ?? []).map(
              (ingredient: any) => ({
                product_id:
                  ingredient.product_id,
                name_override:
                  ingredient.name_override,
                display_name:
                  ingredient.display_name,
                measurement:
                  ingredient.measurement ?? '',
              })
            )
          );
        } catch (err: any) {
          setError(
            err.message ||
              'Failed to load formula.'
          );
        } finally {
          setLoading(false);
        }
      };

      loadFormula();
    }, [id])
  );

  const fetchProducts = async () => {
    setLoadingProducts(true);

    try {
      const res = await authFetch(
        `${API_BASE}/products/`
      );

      if (res.status === 401) {
        return;
      }

      if (!res.ok) {
        throw new Error(
          'Failed to load products.'
        );
      }

      const data = await res.json();
      setAllProducts(data);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to load products.'
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const addManualIngredient = () => {
    if (!manualName.trim()) {
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        name_override: manualName.trim(),
        display_name: manualName.trim(),
        measurement:
          manualMeasurement.trim(),
      },
    ]);

    setManualName('');
    setManualMeasurement('');
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    setError('');

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      setSaving(true);

      const res = await authFetch(
        `${API_BASE}/formulas/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            notes:
              notes.trim() || null,
            star_rating:
              starRating || null,
            ingredients:
              ingredients.map(
                (ingredient, index) => ({
                  product_id:
                    ingredient.product_id ??
                    null,
                  name_override:
                    ingredient.name_override ??
                    null,
                  measurement:
                    ingredient.measurement ||
                    null,
                  order: index,
                })
              ),
          }),
        }
      );

      if (res.status === 401) {
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || 'Failed to save.'
        );
      }

      router.replace(
        `/(app)/formulas/${id}` as any
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Something went wrong.'
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
          Edit Formula
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
            <Text
              style={styles.saveBtnText}
            >
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

          <ImagePickerButton
            uploadUrl={`/formulas/${id}/image`}
            imageUrl={imageUrl}
            onUploadComplete={(url) =>
              setImageUrl(url)
            }
            onDeleteComplete={() =>
              setImageUrl(null)
            }
          />

          <Text style={styles.label}>
            Formula Name *
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Coral Sunset Mix"
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
            placeholder="Application tips, finish, occasion…"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Text style={styles.label}>
            Rating
          </Text>

          <StarPicker
            value={starRating}
            onChange={setStarRating}
          />
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Ingredients
          </Text>

          {ingredients.map(
            (ingredient, index) => (
              <View
                key={index}
                style={styles.ingredientRow}
              >
                <View
                  style={styles.ingredientInfo}
                >
                  <Text
                    style={
                      styles.ingredientName
                    }
                    numberOfLines={1}
                  >
                    {
                      ingredient.display_name
                    }
                  </Text>

                  {ingredient.measurement ? (
                    <Text
                      style={
                        styles.ingredientMeasurement
                      }
                    >
                      {
                        ingredient.measurement
                      }
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() =>
                    removeIngredient(index)
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
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

            <Text
              style={styles.pickBtnText}
            >
              Pick from my products
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>
            Or add manually:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Ingredient name"
            placeholderTextColor={
              COLORS.textSecondary
            }
            value={manualName}
            onChangeText={setManualName}
          />

          <View style={styles.measureRow}>
            <TextInput
              style={[
                styles.input,
                {
                  flex: 1,
                  marginBottom: 0,
                },
              ]}
              placeholder="Measurement (e.g. 2 parts, 5ml)"
              placeholderTextColor={
                COLORS.textSecondary
              }
              value={manualMeasurement}
              onChangeText={
                setManualMeasurement
              }
            />

            <TouchableOpacity
              style={styles.addIngBtn}
              onPress={
                addManualIngredient
              }
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

      {/* Product Picker Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Pick a Product
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowProductModal(false);
                setPendingProductId(null);
              }}
            >
              <Ionicons
                name="close"
                size={24}
                color={COLORS.text}
              />
            </TouchableOpacity>
          </View>

          {pendingProductId ? (
            <View
              style={styles.measurementForm}
            >
              <Text style={styles.label}>
                Measurement for{' '}
                {pendingProductName}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. 2 parts, 5ml, 1 scoop"
                placeholderTextColor={
                  COLORS.textSecondary
                }
                value={pendingMeasurement}
                onChangeText={
                  setPendingMeasurement
                }
                autoFocus
              />

              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setIngredients((prev) => [
                    ...prev,
                    {
                      product_id:
                        pendingProductId,
                      display_name:
                        pendingProductName,
                      measurement:
                        pendingMeasurement.trim(),
                    },
                  ]);

                  setPendingProductId(null);
                  setPendingProductName('');
                  setPendingMeasurement('');
                  setShowProductModal(false);
                }}
              >
                <Text
                  style={styles.buttonText}
                >
                  Add Ingredient
                </Text>
              </TouchableOpacity>
            </View>
          ) : loadingProducts ? (
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={
                    styles.modalProduct
                  }
                  onPress={() => {
                    setPendingProductId(
                      item.id
                    );

                    setPendingProductName(
                      item.brand
                        ? `${item.brand} ${item.name}`
                        : item.name
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

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.border}
                  />
                </TouchableOpacity>
              )}
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
    height: 80,
    textAlignVertical: 'top',
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },

  ingredientInfo: {
    flex: 1,
  },

  ingredientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  ingredientMeasurement: {
    fontSize: 13,
    color: COLORS.accent,
    marginTop: 2,
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

  measureRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  addIngBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  measurementForm: {
    padding: 20,
  },

  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
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
    justifyContent:
      'space-between',
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
