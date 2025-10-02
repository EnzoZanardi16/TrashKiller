import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';

import Enemy1Image from '../assets/images/Enemy1.png';

const Enemy = ({ position, health }) => {
  const [x, y] = position;
  const [isFlashing, setIsFlashing] = useState(false);
  const lastHealth = React.useRef(health);

  useEffect(() => {
    if (health < lastHealth.current) {
      // Começa o efeito de piscar
      setIsFlashing(true);
      // Desativa o piscar após 200ms
      setTimeout(() => {
        setIsFlashing(false);
      }, 200);
    }
    lastHealth.current = health;
  }, [health]);

  return (
    <View style={[styles.enemyContainer, { left: x, top: y }]}>
      <Image
        source={Enemy1Image}
        style={[
          styles.enemyImage,
          { opacity: isFlashing ? 0.2 : 1 } // Altera a opacidade para piscar
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  enemyContainer: {
    width: 50,
    height: 60,
    position: 'absolute',
  },
  enemyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default Enemy;