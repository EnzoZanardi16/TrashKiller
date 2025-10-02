import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import { GameEngine } from 'react-native-game-engine';
import entities from './entities';
import GameSystem from './systems/GameSystem';
import EnemySpawnSystem from './systems/EnemySpawnSystem';
import LivesDisplay from './components/LivesDisplay';
import GameOverPopup from './components/GameOverPopup';
import TimerDisplay from './components/TimerDisplay';

export default function App() {
  const [running, setRunning] = useState(true);
  const [playerLives, setPlayerLives] = useState(3);
  const [gameTime, setGameTime] = useState(0);
  const engine = useRef(null);

  // O tempo de início da partida, usando o tempo do próprio game engine
  const initialGameTime = useRef(null);

  const handleGameEvent = (e) => {
    if (e.type === 'life-lost') {
      setPlayerLives(prevLives => {
        const newLives = prevLives - 1;
        if (newLives <= 0) {
          setRunning(false);
        }
        return newLives;
      });
    } else if (e.type === 'life-gained') {
      setPlayerLives(prevLives => Math.min(prevLives + 1, 3));
    }
  };

  const handleRestart = () => {
    setRunning(true);
    setPlayerLives(3);
    setGameTime(0);
    initialGameTime.current = null; // Reseta o tempo inicial
    if (engine.current) {
      engine.current.swap(entities());
    }
  };

  const onUpdate = (entities, { touches, time, dispatch }) => {
    if (running) {
      // Se for a primeira vez, define o tempo de início
      if (initialGameTime.current === null) {
        initialGameTime.current = time.current;
      }
      
      const elapsedTime = time.current - initialGameTime.current;
      setGameTime(elapsedTime);

      const updatedEntities = GameSystem(entities, { touches, time: { current: elapsedTime }, dispatch });
      EnemySpawnSystem(updatedEntities, { time: { current: elapsedTime } });
      return updatedEntities;
    }
    return entities;
  };
  
  return (
    <View style={styles.container}>
      {running ? (
        <GameEngine
          ref={engine}
          systems={[onUpdate]}
          entities={entities()}
          onEvent={handleGameEvent}
          running={running}
          style={styles.gameContainer}
        >
          <StatusBar hidden={true} />
          <LivesDisplay lives={playerLives} />
          <TimerDisplay time={gameTime} />
        </GameEngine>
      ) : (
        <GameOverPopup onRestart={handleRestart} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gameContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
  },
});