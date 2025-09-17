import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { ALLERGEN_CATEGORIES } from '../constants/allergenCategories';


export default function AllergenBubble({ label, selected, onPress }) {
  const mainLabels = ALLERGEN_CATEGORIES.map(cat => cat.label);
  const isMain = mainLabels.includes(label);
  return (
    <TouchableOpacity
      style={[styles.bubble, selected ? styles.selected : styles.unselected, isMain ? { backgroundColor: Colors.light.buttonBg } : null]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.bubbleText, selected ? styles.selectedText : styles.unselectedText, isMain ? { color: Colors.light.buttonText } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    backgroundColor: '#EFE9E1',
    borderWidth: 2,
    borderColor: '#A89F91',
  },
  selected: {
    backgroundColor: '#6d3c7d',
    borderColor: '#d4badf',
  },
  unselected: {
    backgroundColor: '#d4badf',
    borderColor: '#917db2',
  },
  bubbleText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B4F2A',
  },
  selectedText: {
    color: '#d4badf',
    fontWeight: 'bold',
  },
  unselectedText: {
    color: '#8e659d',
  },
});
