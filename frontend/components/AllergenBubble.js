import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Bubble({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.bubble, selected ? styles.selected : styles.unselected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.bubbleText, selected ? styles.selectedText : styles.unselectedText]}>{label}</Text>
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
    backgroundColor: '#8D6742',
    borderColor: '#6B4F2A',
  },
  unselected: {
    backgroundColor: '#EFE9E1',
    borderColor: '#A89F91',
  },
  bubbleText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B4F2A',
  },
  selectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unselectedText: {
    color: '#6B4F2A',
  },
});
