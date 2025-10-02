import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

import ShotImage from '../assets/images/tiro.png';

const Projectile = ({ position }) => {
  const [x, y] = position;
  
  // Calcula o ajuste para centralizar o projétil na nave do jogador
  // O projétil tem 50 de largura, então ajustamos -25 para centralizar
  // O projétil tem 100 de altura, então ajustamos -50 para que o topo saia da ponta da nave
  const adjustedX = x - 25;
  const adjustedY = y - 50;
  
  return (
    <View style={[styles.projectileContainer, { left: adjustedX, top: adjustedY }]}>
      <Image
        source={ShotImage}
        style={styles.projectileImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  projectileContainer: {
    width: 50,
    height: 100,
    position: 'absolute',
  },
  projectileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default Projectile;