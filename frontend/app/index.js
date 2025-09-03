import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

import { LogBox } from 'react-native'; LogBox.ignoreLogs([
    'Invalid prop `style` supplied to `React.Fragment`',
]);

export default function App() {
    const [allergens, setAllergens] = useState([]);
    const [inputAllergen, setInputAllergen] = useState("");
    const [image, setImage] = useState(null);

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
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "Camera access is required");
            return;
        }
        const result = await ImagePicker.launchCameraAsync();
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImage(result.assets[0].uri);
            Alert.alert("Photo taken", "Image captured successfully");
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
                </View>
            )}
            <View style={{ marginTop: 40 }}>
                <Button title="Take Photo" onPress={takePhoto} />
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
