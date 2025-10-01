// components/GameObject.js
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const GameObject = ({ x, y, size, imageSource, style }) => {
    const isSizeObject = typeof size === 'object';
    const width = isSizeObject ? size.width : size;
    const height = isSizeObject ? size.height : size;

    return (
        <View 
            style={[
                styles.gameObject, 
                { left: x - width / 2, top: y - height / 2, width: width, height: height },
                style // ⭐ Adiciona o estilo aqui ⭐
            ]}
        >
            <Image source={imageSource} style={styles.image} resizeMode="contain" />
        </View>
    );
};

const styles = StyleSheet.create({
    gameObject: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        // Outros estilos padrão do GameObject, se houver
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

export default GameObject;