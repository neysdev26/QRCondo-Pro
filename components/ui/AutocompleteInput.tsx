import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface AutocompleteProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectSuggestion: (item: string) => void;
  suggestions: string[];
  placeholder?: string;
  containerStyle?: object;
}

export default function AutocompleteInput({ 
  label, value, onChangeText, onSelectSuggestion, suggestions, placeholder, containerStyle 
}: AutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filtra sugestões que não são iguais ao valor atual
  const filtered = suggestions.filter(item => item && item !== value);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(t: string) => { onChangeText(t); setShowSuggestions(true); }} // 👈 tipagem adicionada
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
        placeholder={placeholder}
      />
      
      {showSuggestions && filtered.length > 0 && (
        <View style={styles.suggestionList}>
          {filtered.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.suggestionItem} 
              onPress={() => { 
                onSelectSuggestion(item); 
                setShowSuggestions(false); 
              }}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginBottom: 15, 
    position: 'relative',
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: COLORS.text },
  input: { 
    borderWidth: 3,
    borderColor: '#d6d9dd', 
    borderRadius: 10, 
    padding: 12, 
    backgroundColor: '#f8fafc', 
    fontSize: 16 
  },
  suggestionList: { 
    position: 'absolute', 
    top: 78,
    left: 0, 
    right: 0, 
    backgroundColor: '#FFF', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#DDD', 
    elevation: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  suggestionItem: { 
    padding: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF' 
  },
  suggestionText: { fontSize: 15, color: '#333' }
});