import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Alert, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AllergenBubble from "../components/AllergenBubble";
import { Colors } from '../constants/Colors';
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
import { extractMenuItemsFromImage } from '../helpers/geminiOCR';
import * as FileSystem from 'expo-file-system';
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
    const [extractedText, setExtractedText] = useState(''); // legacy
    const [menuItems, setMenuItems] = useState([]); // Gemini structured output
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
            // Remove duplicates from selectedAllergens for display
            const uniqueSelected = Array.from(new Set(selectedAllergens));
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
                    <Text style={styles.selectedAllergensText}>
                        {uniqueSelected.length > 0
                            ? (<Text><Text style={{ fontWeight: 'bold', color: Colors.light.subBubbleText }}>Currently selected: </Text>{uniqueSelected.join(', ')}</Text>)
                            : (<Text style={{ fontWeight: 'bold', color: Colors.light.subBubbleText }}>Nothing selected</Text>)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: Colors.dark.buttonBg, marginRight: 10, opacity: uniqueSelected.length === 0 ? 0.5 : 1 }]}
                            onPress={uniqueSelected.length === 0 ? undefined : saveAllergens}
                            disabled={uniqueSelected.length === 0}
                        >
                            <Text style={[styles.saveButtonText, { color: Colors.dark.buttonText }]}>Next</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: Colors.dark.buttonBg }]} onPress={() => { setSelectedAllergens([]); setCustomAllergens({}); AsyncStorage.removeItem('allergens'); AsyncStorage.removeItem('customAllergens'); }}>
                            <Text style={[styles.saveButtonText, { color: Colors.dark.buttonText }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>
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
                // If all are already selected, deselect everything
                const allSubtypes = [...subtypes.filter(s => s !== 'Other'), ...customForCategory];
                const allSelected = allSubtypes.every(s => selectedAllergens.includes(s));
                if (allSelected) {
                    setSelectedAllergens(selectedAllergens.filter(a => !allSubtypes.includes(a)));
                } else {
                    setSelectedAllergens([
                        ...selectedAllergens.filter(a => !subtypes.includes(a)),
                        ...subtypes.filter(s => s !== 'Other'),
                        ...customForCategory
                    ]);
                }
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
                        <TouchableOpacity
                            style={[styles.backButton, { backgroundColor: Colors.light.buttonBg, flexDirection: 'row', alignItems: 'center' }]}
                            onPress={() => { setSelectedCategory(null); if (inputRef.current) inputRef.current.blur(); }}
                        >
                            <Text style={{ color: Colors.light.buttonText, fontSize: 18 }}>←</Text>
                        </TouchableOpacity>
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
                            style={[styles.input, { color: Colors.light.subBubbleText, backgroundColor: Colors.light.subBubbleBg, borderColor: Colors.light.bubbleBg }]}
                            placeholder={`Add custom ${catObj.label} allergen...`}
                            value={manualInput}
                            onChangeText={setManualInput}
                            placeholderTextColor={Colors.light.subBubbleText}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                        />
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: Colors.dark.buttonBg }]}
                            onPress={addCustomAllergen}
                        >
                            <Text style={[styles.addButtonText, { color: Colors.dark.buttonText }]}>Add</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Persist selected allergens list across subpages, remove duplicates */}
                    <Text style={styles.selectedAllergensText}>
                        {selectedAllergens.length > 0
                            ? (<Text><Text style={{ fontWeight: 'bold', color: Colors.light.subBubbleText }}>Currently selected: </Text>{Array.from(new Set(selectedAllergens)).join(', ')}</Text>)
                            : (<Text style={{ fontWeight: 'bold', color: Colors.light.subBubbleText }}>Nothing selected</Text>)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 8 }}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: Colors.dark.buttonBg, marginRight: 10, opacity: selectedAllergens.length === 0 ? 0.5 : 1 }]}
                            onPress={selectedAllergens.length === 0 ? undefined : saveAllergens}
                            disabled={selectedAllergens.length === 0}
                        >
                            <Text style={[styles.saveButtonText, { color: Colors.dark.buttonText }]}>Next</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: Colors.dark.buttonBg }]} onPress={() => { setSelectedAllergens([]); setCustomAllergens({}); AsyncStorage.removeItem('allergens'); AsyncStorage.removeItem('customAllergens'); }}>
                            <Text style={[styles.saveButtonText, { color: Colors.dark.buttonText }]}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            );
        }
    }

    // Main page: take image, loading, and show output
    // Gemini OCR extraction
    const extractTextWithGemini = async (imageUri) => {
        try {
            setMenuItems([]);
            // Read image as base64 using expo-file-system
            const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
            // Estimate size in bytes
            const sizeBytes = Math.ceil(base64.length * 3 / 4);
            let format = 'jpeg';
            if (imageUri.toLowerCase().endsWith('.png')) format = 'png';
            else if (imageUri.toLowerCase().endsWith('.jpg') || imageUri.toLowerCase().endsWith('.jpeg')) format = 'jpeg';
            console.log(`Image format: ${format}`);
            console.log(`Image size: ${(sizeBytes / 1024).toFixed(1)}KB`);
            // Call Gemini helper
            const items = await extractMenuItemsFromImage(base64);
            setMenuItems(items);
            // try {
            //     console.log('Extracted menu items (JSON):', JSON.stringify(items, null, 2));
            // } catch (e) {
            //     console.log('Extracted menu items:', items);
            // }
        } catch (error) {
            console.error("Error processing image with Gemini:", error);
            Alert.alert("OCR Error", error.message);
        } finally {
            setLoading(false);
        }
    };

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
        let result;
        try {
            result = await ImagePicker.launchCameraAsync({ base64: false, quality: 0.3 });
        } catch (err) {
            console.error('Error launching camera:', err);
            Alert.alert('Camera Error', err.message || 'Unknown error');
            setLoading(false);
            return;
        }
        if (!result) {
            setLoading(false);
            return;
        }
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
            await extractTextWithGemini(photoUri);
        } else {
            setLoading(false);
        }
    };
    return (
        <View style={styles.centeredContainer}>
            {loading && <ActivityIndicator size="large" color={Colors.light.buttonBg} style={{ marginTop: 20 }} />}
            {image && !loading && (
                <Image source={{ uri: image }} style={styles.imagePreview} />
            )}
            <TouchableOpacity
                style={[image ? styles.retakeButton : styles.cameraButton, { backgroundColor: Colors.dark.buttonBg, justifyContent: 'center', alignItems: 'center', display: 'flex' }]}
                onPress={takePhoto}
                disabled={loading}
            >
                <Text style={[image ? styles.retakeButtonText : styles.cameraButtonText, { color: Colors.dark.buttonText, textAlign: 'center', width: '100%' }]}> 
                    {loading ? 'Loading...' : image ? 'Retake' : 'Take Image'}
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editIcon} onPress={() => setScreen('allergenSelect')}>
                <Text style={styles.editIconText}>⚙️</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    cameraPreview: {
        width: 220,
        height: 220,
        borderRadius: 18,
        marginTop: 20,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#A89F91',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    editIcon: {
        position: 'absolute',
        top: 36,
        right: 18,
        zIndex: 10,
        backgroundColor: 'transparent',
        padding: 8,
    },
    editIconText: {
        fontSize: 28,
        color: '#8D6742',
    },
    retakeButton: {
        backgroundColor: '#A89F91',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 18,
        marginTop: 16,
        marginBottom: 10,
        alignSelf: 'center',
        minWidth: 100,
    },
    retakeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    menuList: {
        marginTop: 20,
        width: '95%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    menuItem: {
        padding: 15,
        backgroundColor: 'white',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 10,
    },
    dishName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    ingredients: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    otherText: {
        fontSize: 14,
        color: '#888',
    },
    outputHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        textAlign: 'center',
    },
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
        color: Colors.light.subBubbleText,
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
        color: Colors.light.subBubbleText,
    },
    cameraButton: {
        backgroundColor: '#8D6742',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 28,
        marginTop: 20,
        marginBottom: 10,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
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
        extractedTextBox: {
            width: '95%',
            alignSelf: 'center',
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 16,
            marginTop: 20,
            marginBottom: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        extractedText: {
            fontSize: 16,
            color: '#333',
            textAlign: 'left',
            width: '100%',
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
        },
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
