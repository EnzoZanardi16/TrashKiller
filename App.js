// App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GameScreen from './src/screens/GameScreen'; // Certifique-se de que o caminho está correto

export default function App() {
  return (
    // Usa o Provider para configurar a área segura
    <SafeAreaProvider style={{ backgroundColor: '#000' }}>
      <GameScreen />
    </SafeAreaProvider>
  );
}