import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

import LifeImage from '../assets/images/vida.png';
import RapidFireImage from '../assets/images/energy.png';

const PowerUp = ({ position, type }) => {
  const [x, y] = position;

  // Lógica para escolher a imagem com base no tipo
  const imageSource = type === 'rapid-fire' ? RapidFireImage : LifeImage;

  return (
    <View style={[styles.powerUpContainer, { left: x, top: y }]}>
      <Image
        source={imageSource}
        style={styles.powerUpImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  powerUpContainer: {
    width: 20,
    height: 20,
    position: 'absolute',
  },
  powerUpImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default PowerUp;