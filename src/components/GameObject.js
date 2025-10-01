// src/components/GameObject.js
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const SIZE = 40;

export default function GameObject({ x, y, color = 'gray', size = SIZE }) {
  // Garante que a posição é 'absolute' e calculada a partir do canto superior esquerdo
  const style = {
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    backgroundColor: color,
  };

  return <View style={[styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    borderRadius: 5, // Um pequeno arredondamento para dar um toque
  },
});