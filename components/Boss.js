import React, { useState, useEffect } from 'react';
import { Image, View, Dimensions } from 'react-native';

import BossImage from '../assets/images/Boss.png';

const { width: screenWidth } = Dimensions.get('window');

const Boss = (props) => {
    const { position, health } = props;
    const [isFlashing, setIsFlashing] = useState(false);
    const lastHealth = React.useRef(health);

    useEffect(() => {
        if (health < lastHealth.current) {
            setIsFlashing(true);
            setTimeout(() => {
                setIsFlashing(false);
            }, 300);
        }
        lastHealth.current = health;
    }, [health]);

    return (
        <View
            style={{
                position: 'absolute',
                left: -60, // Ajuste para centralizar o chefe na tela
                top: position[1],
                width: screenWidth + 120,
                height: 320,
            }}
        >
            <Image
                source={BossImage}
                style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                    opacity: isFlashing ? 0.2 : 1,
                }}
            />
        </View>
    );
};

export default Boss;