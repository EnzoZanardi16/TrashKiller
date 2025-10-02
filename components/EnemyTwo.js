import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';

import Enemy2Image from '../assets/images/Enemy2.png';

const EnemyTwo = ({ position, health }) => {
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
        source={Enemy2Image}
        style={[
          styles.enemyImage,
          { opacity: isFlashing ? 0.2 : 1 }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  enemyContainer: {
    width: 50,
    height: 50,
    position: 'absolute',
  },
  enemyImage: {
    width: '150%',
    height: '150%',
    resizeMode: 'contain',
  },
});

export default EnemyTwo;