import React from 'react';
import { View } from 'react-native';

const EnemyProjectile = (props) => {
    const { position } = props;
    const size = 15;

    return (
        <View
            style={{
                backgroundColor: 'red',
                width: size,
                height: size,
                position: 'absolute',
                left: position[0],
                top: position[1],
                borderRadius: size / 2,
            }}
        />
    );
};

export default EnemyProjectile;