import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { COLORS, DIP_TYPES } from '../constants/theme';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';

export default function AddDipScreen() {
  const router = useRouter();

  const [brand, setBrand] = useState('');
  const [colorName, setColorName] = useState('');
  const [colorCode, setColorCode] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [image, setImage] = useState<any>(null);

  // 📸 Pick image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 💾 Save dip
  const saveDip = async () => {
    if (!brand || !colorName) {
      Alert.alert('Error', 'Brand and Color Name are required');
      return;
    }

    let imageUrl = null;

    try {
      // Upload image
      if (image) {
        const fileName = `${Date.now()}.jpg`;

        const response = await fetch(image);
        const blob = await response.blob();

        const { error: uploadError } = await supabase.storage
          .from('nail-images')
          .upload(fileName, blob);

        if (uploadError) {
          console.log(uploadError);
          Alert.alert('Error', 'Image upload failed');
          return;
        }

        const { data } = supabase.storage
          .from('nail-images')
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      // Save to Supabase
      const { error } = await supabase.from('nail_dips').insert([
        {
          brand,
          color: colorName,
          color_code: colorCode,
          type,
          notes,
          image_url: imageUrl,
        },
      ]);

      if (error) {
        console.log(error);
        Alert.alert('Error', 'Failed to save dip');
        return;
      }

      Alert.alert('Success', 'Dip saved!');
      router.back();

      // Reset form
      setBrand('');
      setColorName('');
      setColorCode('');
      setNotes('');
      setType('');
      setExpirationDate('');
      setImage(null);
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Dip 💅</Text>

      <TextInput
        placeholder="Brand"
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
      />

      <TextInput
        placeholder="Color Name"
        style={styles.input}
        value={colorName}
        onChangeText={setColorName}
      />

      <TextInput
        placeholder="Color Code"
        style={styles.input}
        value={colorCode}
        onChangeText={setColorCode}
      />

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={type}
          onValueChange={(itemValue) => setType(itemValue)}
        >
          <Picker.Item label="Select Type..." value="" />
          {DIP_TYPES.map((t) => (
            <Picker.Item key={t} label={t} value={t} />
          ))}
        </Picker>
      </View>

      <TextInput
        placeholder="Notes"
        style={[styles.input, { height: 100 }]}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TextInput
        placeholder="Expiration Date (YYYY-MM-DD)"
        style={styles.input}
        value={expirationDate}
        onChangeText={setExpirationDate}
      />

      {/* 📸 Pick Image */}
      <TouchableOpacity style={styles.saveButton} onPress={pickImage}>
        <Text style={styles.saveButtonText}>Pick Image</Text>
      </TouchableOpacity>

      {/* 📸 Preview */}
      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: 150, height: 150, marginBottom: 15 }}
        />
      )}

      {/* 💾 Save */}
      <TouchableOpacity style={styles.saveButton} onPress={saveDip}>
        <Text style={styles.saveButtonText}>Save Dip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});