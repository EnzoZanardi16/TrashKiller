import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TimerDisplay = ({ time }) => {
  const totalSeconds = Math.floor(time / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{minutes}:{seconds}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default TimerDisplay;