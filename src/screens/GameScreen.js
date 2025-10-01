// src/screens/GameScreen.js - VERSÃO FINAL CORRIGIDA
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, TouchableOpacity } from 'react-native';
import GameObject from '../components/GameObject';

// --- CONFIGURAÇÕES DO JOGO ---
// REMOVIDA A LINHA 'const positionOffset = useRef({ x: 0, y: 0 });' daqui!
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 30;
const BULLET_SIZE = 10;
const GAME_LOOP_INTERVAL = 1000 / 60; // 60 FPS
const BULLET_SPEED = 15;
const ENEMY_SPEED = 3;

const FIRE_RATE = 200; // Tiros a cada 200ms (5 tiros por segundo)
const WAVE_INTERVAL = 2000; // Tempo em ms entre o spawn de inimigos

// --- ESTADO INICIAL ---
const initialGameState = {
  player: { x: screenWidth / 2, y: screenHeight - 100, isAlive: true },
  enemies: [],
  bullets: [],
  timeSurvived: 0,
  enemySpawnTimer: WAVE_INTERVAL,
  autoFireTimer: FIRE_RATE,
  nextEnemyId: 1,
  nextBulletId: 1,
};

// --- FUNÇÕES DE LÓGICA DE JOGO ---

// Função auxiliar para detecção de colisão (AABB)
const isColliding = (objA, sizeA, objB, sizeB) => {
  const dx = Math.abs(objA.x - objB.x) * 2;
  const dy = Math.abs(objA.y - objB.y) * 2;
  return dx < sizeA + sizeB && dy < sizeA + sizeB;
};


export default function GameScreen() {
  const [gameState, setGameState] = useState(initialGameState);
  const gameLoopRef = useRef(null);
  
  // 1. Hook CORRETO para rastrear a posição inicial da nave
  const playerPositionRef = useRef({ x: initialGameState.player.x, y: initialGameState.player.y });
  
  // --- CONFIGURAÇÃO DO PANRESPONDER (ARRASAR A NAVE LIVREMENTE) ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      // onPanResponderGrant: Quando o toque começa, registra a posição ATUAL da nave.
      onPanResponderGrant: (evt, gestureState) => {
        // Usa a posição ATUAL do estado (gameState)
        playerPositionRef.current = { 
            x: gameState.player.x, 
            y: gameState.player.y 
        };
      },
      
      // onPanResponderMove: Usa o deslocamento (dx, dy) para arrastar a nave.
      onPanResponderMove: (evt, gestureState) => {
        // Necessário para evitar o erro de evento reciclado
        evt.persist(); 
        
        if (!gameState.player.isAlive) return;

        // Calcula a nova posição baseada na posição inicial de toque + deslocamento (dx, dy).
        let newX = playerPositionRef.current.x + gestureState.dx;
        let newY = playerPositionRef.current.y + gestureState.dy;

        // Limita a nave dentro dos limites da tela (Horizontal)
        newX = Math.max(PLAYER_SIZE / 2, Math.min(screenWidth - PLAYER_SIZE / 2, newX));
        
        // Limita a nave dentro dos limites da tela (Vertical)
        newY = Math.max(PLAYER_SIZE / 2, Math.min(screenHeight - PLAYER_SIZE / 2, newY));

        // ATUALIZA O ESTADO: 
        setGameState(prev => ({
          ...prev,
          player: { 
              ...prev.player, 
              x: newX, 
              y: newY 
          },
        }));
      },
      
      onPanResponderRelease: () => {
        // Opcional: Adicionar lógica ao soltar o toque.
      },
    })
  ).current;

  // --- O LOOP PRINCIPAL DO JOGO ---
  useEffect(() => {
    if (!gameState.player.isAlive) {
      clearInterval(gameLoopRef.current);
      return;
    }

    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        // 1. Atualizar Cronômetro
        const newTimeSurvived = prev.timeSurvived + GAME_LOOP_INTERVAL / 1000;
        let nextState = { ...prev, timeSurvived: newTimeSurvived };

        // 2. Movimento (Balas e Inimigos)
        nextState.bullets = nextState.bullets
          .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
          .filter(b => b.y > 0); 

        nextState.enemies = nextState.enemies
          .map(e => ({ ...e, y: e.y + ENEMY_SPEED }))
          .filter(e => e.y < screenHeight + ENEMY_SIZE); 

        // 3. Spawm de Inimigos (Lógica de Onda)
        let newSpawnTimer = prev.enemySpawnTimer - GAME_LOOP_INTERVAL;
        if (newSpawnTimer <= 0) {
          const newEnemy = {
            id: prev.nextEnemyId,
            x: Math.random() * (screenWidth - ENEMY_SIZE) + ENEMY_SIZE / 2,
            y: -ENEMY_SIZE,
            isAlive: true,
          };
          nextState.enemies.push(newEnemy);
          nextState.nextEnemyId += 1;
          newSpawnTimer = WAVE_INTERVAL * (0.8 + Math.random() * 0.4); 
        }
        nextState.enemySpawnTimer = newSpawnTimer;

        // --- 4. TIRO AUTOMÁTICO ---
        let newFireTimer = prev.autoFireTimer - GAME_LOOP_INTERVAL;
        if (newFireTimer <= 0) {
          nextState.bullets.push({
            id: nextState.nextBulletId,
            x: nextState.player.x,
            y: nextState.player.y - PLAYER_SIZE / 2, 
            isAlive: true,
          });
          nextState.nextBulletId += 1;
          newFireTimer = FIRE_RATE;
        }
        nextState.autoFireTimer = newFireTimer;
        // -------------------------

        // 5. Detecção de Colisão
        let isPlayerHit = false;
        const remainingBullets = [];
        // Colisão Bala vs. Inimigo: Usando splice para remover o inimigo.
        // NOTE: Precisa criar uma cópia para evitar side effects no loop, ou usar filter/map.
        // A lógica de `splice` dentro de um `forEach` é arriscada; vamos otimizá-la aqui para segurança.
        
        const currentEnemies = [...nextState.enemies];
        const nextEnemies = [];
        
        nextState.bullets.forEach(bullet => {
            let bulletHit = false;
            for (let i = 0; i < currentEnemies.length; i++) {
                const enemy = currentEnemies[i];
                if (isColliding(bullet, BULLET_SIZE, enemy, ENEMY_SIZE)) {
                    bulletHit = true;
                    // Marcar para remoção, mas não remover no meio do loop!
                    enemy.isAlive = false; 
                    break;
                }
            }
            if (!bulletHit) {
                remainingBullets.push(bullet);
            }
        });
        
        // Filtra os inimigos que não foram atingidos (isAlive = true)
        nextState.enemies = currentEnemies.filter(e => e.isAlive !== false); 
        nextState.bullets = remainingBullets; // Balas restantes
        
        // Colisão Jogador vs. Inimigo
        for (const enemy of nextState.enemies) {
          if (isColliding(nextState.player, PLAYER_SIZE, enemy, ENEMY_SIZE)) {
            isPlayerHit = true;
            break;
          }
        }

        if (isPlayerHit) {
          return { ...nextState, player: { ...nextState.player, isAlive: false } };
        }

        return nextState;
      });
    }, GAME_LOOP_INTERVAL);

    // Limpeza
    return () => clearInterval(gameLoopRef.current);
  }, [gameState.player.isAlive]); 

  // Formatação do tempo
  const formattedTime = (Math.round(gameState.timeSurvived * 10) / 10).toFixed(1);

  // Função para reiniciar o jogo
  const restartGame = () => {
    // Resetar o estado da nave para o valor inicial
    playerPositionRef.current = { x: initialGameState.player.x, y: initialGameState.player.y };
    setGameState(initialGameState);
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* HUD, Objetos, Game Over (restante do código) */}
      <View style={styles.hud}>
        <Text style={styles.timer}>Tempo: {formattedTime}s</Text>
      </View>

      {/* Renderização dos Objetos do Jogo */}
      {gameState.player.isAlive && (
        <GameObject
          x={gameState.player.x}
          y={gameState.player.y}
          color="blue"
          size={PLAYER_SIZE}
        />
      )}

      {gameState.enemies.map(e => (
        <GameObject
          key={e.id}
          x={e.x}
          y={e.y}
          color="red"
          size={ENEMY_SIZE}
        />
      ))}

      {gameState.bullets.map(b => (
        <GameObject
          key={b.id}
          x={b.x}
          y={b.y}
          color="yellow"
          size={BULLET_SIZE}
        />
      ))}

      {!gameState.player.isAlive && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>FIM DE JOGO!</Text>
          <Text style={styles.finalScore}>Você sobreviveu por {formattedTime} segundos.</Text>
          <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
            <Text style={styles.restartButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    // ... estilos (mantidos os mesmos)
  container: {
    flex: 1,
    backgroundColor: '#000', 
  },
  hud: {
    padding: 10,
    alignItems: 'center',
  },
  timer: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: 'red',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  finalScore: {
    color: '#fff',
    fontSize: 22,
    marginBottom: 30,
  },
  restartButton: {
    backgroundColor: 'blue',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});