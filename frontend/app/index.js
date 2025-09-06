import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from 'expo-image-picker';
import { API_NINJAS_KEY } from '@env';

import { LogBox } from 'react-native'; LogBox.ignoreLogs([
    'Invalid prop `style` supplied to `React.Fragment`',
]);
import { Stack } from 'expo-router';
export default function Layout() {
  return <Stack />;
}

export default function App() {
    const [allergens, setAllergens] = useState([]);
    const [inputAllergen, setInputAllergen] = useState("");
    const [image, setImage] = useState(null);
    const [extractedText, setExtractedText] = useState("");

    useEffect(() => {
        const loadAllergens = async () => {
            const saved = await AsyncStorage.getItem("allergens");
            if (saved) setAllergens(JSON.parse(saved));
        };
        loadAllergens();
    }, []);

    const saveAllergens = async () => {
        await AsyncStorage.setItem("allergens", JSON.stringify(allergens));
        Alert.alert("Saved", "Your preferences have been saved");
    };

    const addAllergen = () => {
        if (inputAllergen.trim() !== "" && !allergens.includes(inputAllergen.trim())) {
            setAllergens([...allergens, inputAllergen.trim()]);
            setInputAllergen("");
        }
    };

    // Camera
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Camera permissions are required to take a photo.');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
            base64: false,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            setImage(uri);
            try {
                const formData = new FormData();
                formData.append('image', {
                    uri,
                    name: 'photo.jpg',
                    type: 'image/jpeg',
                });
                const response = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': API_NINJAS_KEY,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });
                if (!response.ok) throw new Error('API request failed');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0 && data[0].text) {
                    setExtractedText(data.map(obj => obj.text).join('\n'));
                } else {
                    setExtractedText('No text found in image.');
                }
            } catch (e) {
                setExtractedText('Text extraction failed.');
            }
            Alert.alert("Photo taken", "Image captured and processed");
        }
    };

    // Gallery
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Media library permissions are required to select an image.');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
            base64: false,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            setImage(uri);
            try {
                const formData = new FormData();
                formData.append('image', {
                    uri,
                    name: 'photo.jpg',
                    type: 'image/jpeg',
                });
                const response = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key':  API_NINJAS_KEY,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });
                if (!response.ok) throw new Error('API request failed');
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0 && data[0].text) {
                    setExtractedText(data.map(obj => obj.text).join('\n'));
                } else {
                    setExtractedText('No text found in image.');
                }
            } catch (e) {
                setExtractedText('Text extraction failed.');
            }
            Alert.alert("Image picked", "Image loaded and processed");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Dietary Preferences</Text>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter allergen"
                    value={inputAllergen}
                    onChangeText={setInputAllergen}
                />
                <Button title="Add" onPress={addAllergen} />
            </View>
            <FlatList
                data={allergens}
                keyExtractor={(item) => item}
                renderItem={({ item }) => <Text style={styles.allergenItem}>{item}</Text>}
            />
            <Button title="Save Preferences" onPress={saveAllergens} />
            {image && (
                <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 30 }}>
                    <Image source={{ uri: image }} style={{ width: 200, height: 200, borderRadius: 10 }} />
                    {extractedText !== '' && (
                        <Text style={{ marginTop: 20, textAlign: 'center' }}>{extractedText}</Text>
                    )}
                </View>
            )}
            <View style={{ marginTop: 40 }}>
                <Button title="Take Photo" onPress={takePhoto} />
                <View style={{ height: 10 }} />
                <Button title="Pick from Gallery" onPress={pickImage} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, marginTop: 50 },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
    inputRow: { flexDirection: "row", marginBottom: 10 },
    allergenItem: { fontSize: 16, paddingVertical: 5 },
});