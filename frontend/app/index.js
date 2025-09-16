import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Alert, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AllergenBubble from "../components/AllergenBubble";
import { ALLERGEN_CATEGORIES } from "../constants/allergenCategories";
import { KeyboardAvoidingView, Platform } from "react-native";

// Suppress React.Fragment style warning (all variants)
import { LogBox, ActivityIndicator, Image } from 'react-native';
LogBox.ignoreLogs([
    "Warning: Invalid prop `style` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props."
]);
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.apiNinjasKey;

export default function App() {
    // All hooks at top level
    const [screen, setScreen] = useState('allergenSelect');
    const [selectedCategory, setSelectedCategory] = useState(null); // e.g. 'nuts'
    const [selectedAllergens, setSelectedAllergens] = useState([]); // e.g. ['Pecans', 'Peanuts']
    const [manualInput, setManualInput] = useState('');
    // Track custom allergens by category
    const [customAllergens, setCustomAllergens] = useState({}); // { nuts: ['MyNut'], dairy: ['MyDairy'] }
    // Main page: take image, loading, and show output
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [output, setOutput] = useState('');
    // Track focus for custom allergen input
    const [inputFocused, setInputFocused] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const loadAllergens = async () => {
            const saved = await AsyncStorage.getItem('allergens');
            if (saved) setSelectedAllergens(JSON.parse(saved));
            const custom = await AsyncStorage.getItem('customAllergens');
            if (custom) setCustomAllergens(JSON.parse(custom));
        };
        loadAllergens();
    }, []);

    const saveAllergens = async () => {
        await AsyncStorage.setItem('allergens', JSON.stringify(selectedAllergens));
        await AsyncStorage.setItem('customAllergens', JSON.stringify(customAllergens));
        setScreen('main');
    };

    // Main categories
    if (screen === 'allergenSelect') {
        const categories = ALLERGEN_CATEGORIES;
        if (!selectedCategory) {
            // Main menu: show categories
            return (
                <View style={styles.centeredContainer}>
                    <Text style={styles.title}>Select Your Allergies</Text>
                    <View style={styles.bubbleWrap}>
                        {categories.map(cat => (
                            cat.key === "other"
                                ? null // Don't render here, handle below
                                : (
                                    <AllergenBubble
                                        key={cat.key}
                                        label={cat.label}
                                        selected={selectedAllergens.includes(cat.label)}
                                        onPress={() => setSelectedCategory(cat.key)}
                                    />
                                )
                        ))}
                        {/* Only one 'Other' bubble, regardless of custom allergens */}
                        <AllergenBubble
                            key="other"
                            label="Other"
                            selected={selectedAllergens.includes("Other")}
                            onPress={() => setSelectedCategory("other")}
                        />
                    </View>
                    {/* Selected allergies below bubbles, above save button */}
                    {selectedAllergens.length > 0 && (
                        <Text style={styles.selectedAllergensText}>
                            <Text style={{ fontWeight: 'bold', color: '#6B4F2A' }}>Currently selected: </Text>
                            {selectedAllergens.join(', ')}
                        </Text>
                    )}
                    <TouchableOpacity style={styles.saveButton} onPress={saveAllergens}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            // Subtypes menu
            const catObj = categories.find(c => c.key === selectedCategory);
            const subtypes = catObj ? catObj.subtypes : [];
            const selectedSubtypes = selectedAllergens.filter(a => subtypes.includes(a));
            const customForCategory = customAllergens[selectedCategory] || [];
            const toggleSubtype = (sub) => {
                if (selectedAllergens.includes(sub)) {
                    setSelectedAllergens(selectedAllergens.filter(a => a !== sub));
                } else {
                    setSelectedAllergens([...selectedAllergens, sub]);
                }
            };
            const selectAll = () => {
                setSelectedAllergens([
                    ...selectedAllergens.filter(a => !subtypes.includes(a)),
                    ...subtypes.filter(s => s !== 'Other'),
                    ...customForCategory
                ]);
            };
            const addCustomAllergen = () => {
                const trimmed = manualInput.trim();
                if (!trimmed || selectedAllergens.includes(trimmed)) return;
                setSelectedAllergens([...selectedAllergens, trimmed]);
                setCustomAllergens(prev => ({
                    ...prev,
                    [selectedCategory]: [...(prev[selectedCategory] || []), trimmed]
                }));
                setManualInput('');
                if (inputRef.current) inputRef.current.blur();
            };
            return (
                <KeyboardAvoidingView
                    style={{
                        ...styles.centeredContainer,
                        paddingTop: inputFocused ? 48 : 148
                    }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={64}
                >
                    <Text style={styles.title}>Select {catObj.label} Allergies</Text>
                    <View style={styles.bubbleWrapSmall}>
                        <AllergenBubble label="Back" selected={false} onPress={() => { setSelectedCategory(null); if (inputRef.current) inputRef.current.blur(); }} />
                        {/* Only show 'All' button if not 'other' category */}
                        {selectedCategory !== "other" && (
                            <AllergenBubble label="All" selected={selectedSubtypes.length + customForCategory.length === subtypes.length - 1 + customForCategory.length} onPress={() => { selectAll(); if (inputRef.current) inputRef.current.blur(); }} />
                        )}
                        {subtypes.filter(s => s !== 'Other').map(sub => (
                            <AllergenBubble
                                key={sub}
                                label={sub}
                                selected={selectedAllergens.includes(sub)}
                                onPress={() => { toggleSubtype(sub); if (inputRef.current) inputRef.current.blur(); }}
                            />
                        ))}
                        {/* Custom allergens for this category */}
                        {customForCategory.map(sub => (
                            <AllergenBubble
                                key={sub}
                                label={sub}
                                selected={selectedAllergens.includes(sub)}
                                onPress={() => { toggleSubtype(sub); if (inputRef.current) inputRef.current.blur(); }}
                            />
                        ))}
                    </View>
                    <View style={styles.inputRow}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder={`Add custom ${catObj.label} allergen...`}
                            value={manualInput}
                            onChangeText={setManualInput}
                            placeholderTextColor="#8D6742"
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                        />
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={addCustomAllergen}
                        >
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.backButton} onPress={() => setSelectedCategory(null)}>
                        <Text style={styles.backButtonText}>Back to Main</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            );
        }
    }

    // Main page: take image, loading, and show output
    const takePhoto = async () => {
        setLoading(true);
        setExtractedText("");
        setOutput("");
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "Camera access is required");
            setLoading(false);
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.3 });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            let photoUri = result.assets[0].uri;
            try {
                let manipResult = await ImageManipulator.manipulateAsync(
                    photoUri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG }
                );
                photoUri = manipResult.uri;
            } catch (e) {
                // Use original if resize fails
            }
            setImage(photoUri);
        }
        setLoading(false);
    };
    return (
        <View style={styles.centeredContainer}>
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto} disabled={loading}>
                <Text style={styles.cameraButtonText}>{loading ? 'Loading...' : 'Take Image'}</Text>
            </TouchableOpacity>
            {loading && <ActivityIndicator size="large" color="#8D6742" style={{ marginTop: 20 }} />}
            {image && !loading && (
                <Image source={{ uri: image }} style={styles.imagePreview} />
            )}
            {extractedText && !loading && (
                <Text style={styles.extractedText}>{extractedText}</Text>
            )}
            {output && !loading && (
                <View style={styles.outputBox}>
                    <Text style={styles.outputText}>{output}</Text>
                </View>
            )}
            <TouchableOpacity style={styles.editButton} onPress={() => setScreen('allergenSelect')}>
                <Text style={styles.editButtonText}>Edit Preferences</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 20,
        paddingTop: 148,
        backgroundColor: '#F5F3EF',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: '#6B4F2A',
    },
    bubbleWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 30,
    },
    bubbleWrapSmall: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    selectedAllergensRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 10,
    },
    selectedAllergensText: {
        marginBottom: 10,
        textAlign: 'center',
        fontStyle: 'italic',
        color: '#8D6742',
    },
    cameraButton: {
        backgroundColor: '#8D6742',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 28,
        marginTop: 20,
        marginBottom: 10,
        alignSelf: 'center',
    },
    cameraButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
    },
    imagePreview: {
        width: 220,
        height: 220,
        borderRadius: 18,
        marginTop: 20,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#A89F91',
    },
    extractedText: {
        fontSize: 16,
        color: '#6B4F2A',
        marginTop: 10,
        marginBottom: 10,
        textAlign: 'center',
    },
    outputBox: {
        backgroundColor: '#EFE9E1',
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
        marginBottom: 10,
        alignSelf: 'stretch',
        maxWidth: 320,
    },
    outputText: {
        fontSize: 17,
        color: '#6B4F2A',
        textAlign: 'center',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#A89F91',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        marginRight: 10,
        minWidth: 150,
        backgroundColor: '#F5F3EF',
        color: '#6B4F2A',
    },
    addButton: {
        backgroundColor: '#8D6742',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#8D6742',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 25,
        marginTop: 8,
        marginBottom: 2,
        alignSelf: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    backButton: {
        backgroundColor: '#A89F91',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
        marginTop: 4,
        alignSelf: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    editButton: {
        backgroundColor: '#8D6742',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 22,
        marginTop: 20,
        alignSelf: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
    },
    prefText: {
        fontSize: 18,
        color: '#6B4F2A',
        marginBottom: 10,
        fontWeight: '500',
    },
    categorySection: {
        marginBottom: 18,
        backgroundColor: '#EFE9E1',
        borderRadius: 12,
        padding: 10,
    },
    categoryLabel: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#8D6742',
        marginBottom: 5,
    },
});
