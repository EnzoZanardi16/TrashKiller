// components/GameOverPopup.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const GameOverPopup = ({ onRestart }) => {
  return (
    <View style={styles.container}>
      <View style={styles.popup}>
        <Text style={styles.gameOverText}>GAME OVER</Text>
        <TouchableOpacity style={styles.button} onPress={onRestart}>
          <Text style={styles.buttonText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  popup: {
    backgroundColor: '#333',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  gameOverText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GameOverPopup;