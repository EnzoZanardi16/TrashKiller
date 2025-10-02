import React from 'react';
import { View, StyleSheet } from 'react-native';

const LivesDisplay = ({ lives }) => {
  const hearts = [];
  for (let i = 0; i < 3; i++) {
    const isLost = i >= lives;
    hearts.push(
      <View key={i} style={[styles.heart, isLost && styles.heartLost]} />
    );
  }

  return (
    <View style={styles.container}>
      {hearts}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
  },
  heart: {
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  heartLost: {
    backgroundColor: 'gray',
  },
});

export default LivesDisplay;