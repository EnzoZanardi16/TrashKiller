import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

import ProtaImage from '../assets/images/prota.png'; // Substitua pelo caminho correto

const Player = ({ position, isInvincible }) => {
  const [x, y] = position;
  
  // Condição para fazer a nave piscar se estiver invencível
  const opacity = isInvincible && (Math.floor(Date.now() / 100) % 2) ? 0.3 : 1;

  // Ajusta a posição para centralizar a nave dentro do novo contêiner
  const adjustedX = x - 50; // Metade da diferença de largura (150 - 50 = 100 / 2 = 50)
  const adjustedY = y - 50; // Metade da diferença de altura (150 - 50 = 100 / 2 = 50)

  return (
    <View style={[styles.playerContainer, { left: adjustedX, top: adjustedY }]}>
      <Image
        source={ProtaImage}
        style={[
          styles.playerImage,
          { opacity: opacity }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    width: 150,
    height: 150,
    position: 'absolute',
  },
  playerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default Player;