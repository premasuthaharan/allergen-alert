import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList, Image, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";


import { LogBox } from 'react-native'; LogBox.ignoreLogs([
    'Invalid prop `style` supplied to `React.Fragment`',
]);

import Constants from 'expo-constants';
const apiKey = Constants.expoConfig.extra.apiNinjasKey;

export default function App() {
    const [allergens, setAllergens] = useState([]);
    const [inputAllergen, setInputAllergen] = useState("");
    const [image, setImage] = useState(null);
    const [extractedText, setExtractedText] = useState("");

    // Load
    useEffect(() => {
        const loadAllergens = async () => {
            const saved = await AsyncStorage.getItem("allergens");
            if (saved) setAllergens(JSON.parse(saved));
        };
        loadAllergens();
    }, []);

    // Save
    const saveAllergens = async () => {
        await AsyncStorage.setItem("allergens", JSON.stringify(allergens));
        Alert.alert("Saved", "Your preferences have been saved");
    };

    // Add
    const addAllergen = () => {
        if (inputAllergen.trim() !== "" && !allergens.includes(inputAllergen.trim())) {
            setAllergens([...allergens, inputAllergen.trim()]);
            setInputAllergen("");
        }
    };

    // Camera
    const takePhoto = async () => {
        setExtractedText("");
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "Camera access is required");
            return;
        }
        // Set quality to 0.3 to reduce file size
        const result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.3 });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            let photoUri = result.assets[0].uri;
            // Compress/resize image to help ensure <200KB
            try {
                let manipResult = await ImageManipulator.manipulateAsync(
                    photoUri,
                    [{ resize: { width: 800 } }], // Resize to max width 800px (adjust as needed)
                    { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
                );
                photoUri = manipResult.uri;
            } catch (e) {
                // Use original if resize fails
            }
            setImage(photoUri);
            // API for extraction
            try {
                const formData = new FormData();
                formData.append('image', {
                    uri: photoUri,
                    name: 'photo.jpg',
                    type: 'image/jpeg',
                });
                const response = await fetch('https://api.api-ninjas.com/v1/imagetotext', {
                    method: 'POST',
                    headers: {
                        'X-Api-Key': apiKey,
                        'Accept': 'application/json',
                    },
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error('Failed to extract text');
                }
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    const allText = data.map(obj => obj.text).join('\n');
                    setExtractedText(allText);
                } else {
                    setExtractedText('No text found in image.');
                }
            } catch (error) {
                setExtractedText('Error extracting text.');
            }
        }
    };

    // Submimission
    const handleSubmit = () => {
        Alert.alert(
            "Submitted!",
            `Text: ${extractedText}\nPreferences: ${allergens.join(", ")}`
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
                {allergens.map((item) => (
                    <Text key={item} style={styles.allergenItem}>{item}</Text>
                ))}
                <Button title="Save Preferences" onPress={saveAllergens} />
                {image && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 30 }}>
                        <Image source={{ uri: image }} style={{ width: 200, height: 200, borderRadius: 10 }} />
                        <View style={styles.extractedTextBox}>
                            <TextInput
                                style={styles.extractedText}
                                value={extractedText}
                                onChangeText={setExtractedText}
                                multiline
                                textAlign="center"
                                placeholder="Extracted text will appear here..."
                            />
                        </View>
                    </View>
                )}
                <View style={{ marginTop: 40 }}>
                    <Button title="Take Photo" onPress={takePhoto} />
                </View>
                <View style={{ marginTop: 20 }}>
                    <Button title="Submit" onPress={handleSubmit} color="#4CAF50" />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
    container: { flex: 1, padding: 20, marginTop: 50 },
    title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
    inputRow: { flexDirection: "row", marginBottom: 10 },
    allergenItem: { fontSize: 16, paddingVertical: 5 },
    extractedTextBox: {
        marginTop: 16,
        backgroundColor: '#f0f0f0',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'stretch',
        maxWidth: 250,
        alignItems: 'center',
    },
    extractedText: {
        fontSize: 16,
        textAlign: 'center',
        minWidth: 100,
        maxWidth: 250,
        padding: 0,
        backgroundColor: 'transparent',
    },
});
