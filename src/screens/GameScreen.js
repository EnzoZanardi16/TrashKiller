import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, TouchableOpacity } from 'react-native'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameObject from '../components/GameObject';
import { Audio } from 'expo-av';

// --- IMPORTAÇÕES DE IMAGENS E SOM ---
import playerImage from '../../assets/images/prota.png';
import enemyImage1 from '../../assets/images/Enemy1.png'; 
import enemyImage2 from '../../assets/images/Enemy2.png'; 
import bulletImage from '../../assets/images/tiro.png';
import bossImage from '../../assets/images/Boss.png'; 
// import shieldImage from '../../assets/images/shield.png'; // ⭐ REMOVIDO: Não precisamos da imagem do escudo ⭐
import speedImage from '../../assets/images/energy.png';   
import laserSound from '../../assets/sounds/laser.mp3'; 

// --- CONFIGURAÇÕES DO JOGO ---
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Tamanhos visuais
const PLAYER_SIZE = 150; 
const ENEMY_SIZE = 60;   
const ENEMY2_SIZE = 90; 
const BULLET_SIZE = 40;  
const POWERUP_SIZE = 50; 

// Boss
const BOSS_WIDTH = 390;
const BOSS_HEIGHT = 116;
const BOSS_HEALTH = 40; 
const BOSS_SPAWN_INTERVAL = 120; 

// Power-ups
const DROP_CHANCE = 0.10; 
const SHIELD_DURATION = 10000; 
const SPEED_DURATION = 10000;  
const FIRE_RATE_BOOST = 50;    // ⭐ MANTIDO: Valor rápido para efeito perceptível ⭐

// Hitbox
const HITBOX_SCALE = 0.4; 

const GAME_LOOP_INTERVAL = 1000 / 60; 
const BULLET_SPEED = 15;
const ENEMY_SPEED = 3; 
const BASE_FIRE_RATE = 200; // ⭐ MANTIDO: Taxa de tiro base ⭐

// CONFIGURAÇÕES DE DIFICULDADE
const BASE_DIFFICULTY_TIME = 30; 
const MAX_ENEMY_SPEED_MULTIPLIER = 3; 
const MULTIPLE_FORMATION_TIME = 120; 

const SPAWN_CENTER_X = screenWidth / 2;
const SPAWN_CENTER_Y = -ENEMY_SIZE; 

const MAX_SOUND_CHANNELS = 5; 

// --- Mapeamentos de Tipos ---
const ENEMY_IMAGES = {
    enemy1: enemyImage1,
    enemy2: enemyImage2,
};
const ENEMY_SIZES = {
    enemy1: ENEMY_SIZE,
    enemy2: ENEMY2_SIZE,
};
const ENEMY_HEALTH = {
    enemy1: 1, 
    enemy2: 3, 
};

const POWERUP_TYPES = {
    SHIELD: 'shield',
    SPEED: 'speed',
};

const POWERUP_IMAGES = {
    // ⭐ ATUALIZADO: Imagem do escudo é removida aqui ⭐
    // [POWERUP_TYPES.SHIELD]: shieldImage, 
    [POWERUP_TYPES.SPEED]: speedImage,
};

// --- FORMAÇÕES (Mantido) ---
const FORMATIONS = [
  [
    [0, 0], [50, 0], [150, 0], [250, 0], [300, 0],
    [50, 50], [100, 50], [200, 50], [250, 50],
    [150, 100]
  ],
  [
    [0, 0], [50, 0], [100, 0], [150, 0], [200, 0], [250, 0], [300, 0]
  ],
  [
    [0, 0], [50, 0], [100, 0], [150, 0], [200, 0], [250, 0], [300, 0],
    [0, 50], [50, 50], [100, 50], [150, 50], [200, 50], [250, 50], [300, 50],
    [0, 100], [50, 100], [100, 100], [150, 100], [200, 100], [250, 100], [300, 100]
  ]
];

const getFormationWidth = (formation) => {
    const maxDx = formation.reduce((max, [dx]) => Math.max(max, dx), 0);
    const minDx = formation.reduce((min, [dx]) => Math.min(min, dx), Infinity);
    return maxDx - minDx;
};

const getInitialState = (screenWidth, screenHeight) => ({
    player: { x: screenWidth / 2, y: screenHeight - 100, isAlive: true },
    enemies: [],
    bullets: [],
    powerups: [], 
    isInvincible: false, 
    fireRateBoostTime: 0, 
    boss: null, 
    timeSurvived: 0,
    waveTimer: 3000, 
    wave: 1, 
    nextEnemyId: 1,
    nextBulletId: 1,
    nextPowerupId: 1, 
    autoFireTimer: BASE_FIRE_RATE,
});

const isColliding = (objA, sizeA, objB, sizeB) => {
    const sizeAisObject = typeof sizeA === 'object';
    const sizeBisObject = typeof sizeB === 'object';

    const widthA = sizeAisObject ? sizeA.width : sizeA;
    const heightA = sizeAisObject ? sizeA.height : sizeA;
    const widthB = sizeBisObject ? sizeB.width : sizeB;
    const heightB = sizeBisObject ? sizeB.height : sizeB;
    
    const scaledHalfWidthA = (widthA * HITBOX_SCALE) / 2;
    const scaledHalfHeightA = (heightA * HITBOX_SCALE) / 2;
    const scaledHalfWidthB = (widthB * HITBOX_SCALE) / 2;
    const scaledHalfHeightB = (heightB * HITBOX_SCALE) / 2;
    
    const collisionX = Math.abs(objA.x - objB.x) < scaledHalfWidthA + scaledHalfWidthB;
    const collisionY = Math.abs(objA.y - objB.y) < scaledHalfHeightA + scaledHalfHeightB;

    return collisionX && collisionY;
};

const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const pad = (num) => (num < 10 ? '0' : '') + num;

    return `${pad(minutes)}:${pad(seconds)}`;
};

export default function GameScreen() {
    const insets = useSafeAreaInsets(); 
    
    const [gameState, setGameState] = useState(getInitialState(screenWidth, screenHeight));
    
    const [gameKey, setGameKey] = useState(0); 

    const gameLoopRef = useRef(null);
    const latestPlayerPosRef = useRef(gameState.player); 
    const playerPosOnTouchStartRef = useRef(gameState.player);
    
    const soundPoolRef = useRef([]);
    const currentSoundIndexRef = useRef(0);

    useEffect(() => {
        async function setupAudio() {
          if (soundPoolRef.current.length > 0) return; 
          
          try {
            await Audio.setAudioModeAsync({
              allowsRecording: false,
              shouldDuckAndroid: true,
              playsInSilentModeIOS: true,
            });

            const pool = [];
            for (let i = 0; i < MAX_SOUND_CHANNELS; i++) {
              const { sound } = await Audio.Sound.createAsync(laserSound, { shouldPlay: false });
              pool.push(sound);
            }
            soundPoolRef.current = pool;
          } catch (error) {
            console.error("❌ Erro na Configuração de Áudio/Pool:", error);
          }
        }
        setupAudio();
        
        return () => {
          soundPoolRef.current.forEach(sound => {
            if (sound) sound.unloadAsync();
          });
        };
    }, []);

    const playLaserSound = async () => {
        const pool = soundPoolRef.current;
        if (pool.length === 0) return;

        const index = currentSoundIndexRef.current;
        const sound = pool[index];
        currentSoundIndexRef.current = (index + 1) % MAX_SOUND_CHANNELS;

        try {
            await sound.stopAsync(); 
            await sound.playFromPositionAsync(0);

        } catch (error) {
          // Ignorar erros comuns de pool lotada
        }
    };
    
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            
            onPanResponderGrant: (evt, gestureState) => {
                playerPosOnTouchStartRef.current = { 
                    x: latestPlayerPosRef.current.x, 
                    y: latestPlayerPosRef.current.y 
                };
            },
            
            onPanResponderMove: (evt, gestureState) => {
                evt.persist(); 
                if (!gameState.player.isAlive) return;

                let newX = playerPosOnTouchStartRef.current.x + gestureState.dx;
                let newY = playerPosOnTouchStartRef.current.y + gestureState.dy;

                const horizontalMargin = 20; 

                newX = Math.max(horizontalMargin, Math.min(screenWidth - horizontalMargin, newX));
                
                newY = Math.max(PLAYER_SIZE / 2, Math.min(screenHeight - PLAYER_SIZE / 2, newY)); 

                setGameState(prev => ({
                    ...prev,
                    player: { 
                        ...prev.player, 
                        x: newX, 
                        y: newY 
                    },
                }));
            },
            onPanResponderRelease: () => {},
        })
    ).current;

    // --- GAME LOOP ---
    useEffect(() => {
        if (!gameState.player.isAlive) {
            clearInterval(gameLoopRef.current);
            return;
        }

        gameLoopRef.current = setInterval(() => {
            setGameState(prev => {
                const newTimeSurvived = prev.timeSurvived + GAME_LOOP_INTERVAL / 1000;
                let nextState = { ...prev, timeSurvived: newTimeSurvived };
                
                const difficultyFactor = Math.floor(prev.timeSurvived / BASE_DIFFICULTY_TIME);
                const speedMultiplier = 1 + (difficultyFactor * 0.5); 
                const currentEnemySpeed = Math.min(ENEMY_SPEED * speedMultiplier, ENEMY_SPEED * MAX_ENEMY_SPEED_MULTIPLIER);
                
                let formationsToSpawn = 1;
                if (prev.timeSurvived >= MULTIPLE_FORMATION_TIME) {
                    formationsToSpawn = 2; 
                }

                nextState.bullets = nextState.bullets
                    .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
                    .filter(b => b.y > 0); 

                nextState.enemies = nextState.enemies
                    .map(e => ({ ...e, y: e.y + currentEnemySpeed })) 
                    .filter(e => e.y < screenHeight + ENEMY2_SIZE); 
                
                nextState.powerups = nextState.powerups
                    .map(p => ({ ...p, y: p.y + currentEnemySpeed }))
                    .filter(p => p.y < screenHeight + POWERUP_SIZE);


                let currentFireRate = BASE_FIRE_RATE;
                let newFireRateBoostTime = prev.fireRateBoostTime;

                if (prev.fireRateBoostTime > 0) {
                    newFireRateBoostTime = Math.max(0, prev.fireRateBoostTime - GAME_LOOP_INTERVAL);
                    if (newFireRateBoostTime > 0) {
                        currentFireRate = FIRE_RATE_BOOST; 
                    }
                }
                
                let newAutoFireTimer = prev.autoFireTimer - GAME_LOOP_INTERVAL;
                if (newAutoFireTimer <= 0) {
                    playLaserSound(); 
                    
                    nextState.bullets.push({
                        id: nextState.nextBulletId,
                        x: nextState.player.x,
                        y: nextState.player.y - PLAYER_SIZE / 2, 
                        isAlive: true,
                    });
                    nextState.nextBulletId += 1;
                    newAutoFireTimer = currentFireRate; 
                }
                
                // O estado do autoFireTimer é atualizado mais tarde no loop, após a verificação de power-ups
                // É necessário que o newAutoFireTimer seja atualizado com base no currentFireRate *após* a coleta de power-up.
                
                let newBoss = prev.boss;
                const nextBossTime = Math.ceil(prev.timeSurvived / BOSS_SPAWN_INTERVAL) * BOSS_SPAWN_INTERVAL;

                if (!prev.boss && prev.timeSurvived >= nextBossTime - (GAME_LOOP_INTERVAL / 1000) && prev.timeSurvived > 0) {
                    const bossX = screenWidth / 2;
                    const bossY = BOSS_HEIGHT / 2 + 50; 

                    newBoss = {
                        x: bossX,
                        y: bossY,
                        health: BOSS_HEALTH,
                        isAlive: true,
                        width: BOSS_WIDTH,
                        height: BOSS_HEIGHT,
                    };
                    nextState.enemies = []; 
                }
                nextState.boss = newBoss;
                
                let newWaveTimer = prev.waveTimer - GAME_LOOP_INTERVAL;

                if (!nextState.boss && prev.enemies.length === 0 && newWaveTimer <= 0) {
                    let newEnemies = [...prev.enemies];
                    let newNextEnemyId = prev.nextEnemyId;

                    for (let i = 0; i < formationsToSpawn; i++) { 
                        const formationIndex = Math.floor(Math.random() * FORMATIONS.length);
                        const formation = FORMATIONS[formationIndex];
                        
                        const formationWidth = getFormationWidth(formation);
                        const centeringOffset = (formationWidth / 2);
                        
                        const offsetFromCenter = formationsToSpawn > 1 ? (i === 0 ? -100 : 100) : 0;

                        formation.forEach(([dx, dy]) => { 
                            const enemyType = Math.random() < 0.5 ? 'enemy1' : 'enemy2';
                            
                            const newEnemy = {
                                id: newNextEnemyId++,
                                x: SPAWN_CENTER_X + dx - centeringOffset + offsetFromCenter,
                                y: SPAWN_CENTER_Y + dy, 
                                isAlive: true,
                                type: enemyType, 
                                health: ENEMY_HEALTH[enemyType], 
                            };
                            newEnemies.push(newEnemy);
                        });
                    }

                    nextState.enemies = newEnemies;
                    nextState.nextEnemyId = newNextEnemyId;
                    nextState.wave = prev.wave + 1;
                    newWaveTimer = 5000; 
                }

                nextState.waveTimer = newWaveTimer;
                
                let isPlayerHit = false;
                const remainingBullets = [];
                const currentEnemies = [...nextState.enemies];
                
                nextState.bullets.forEach(bullet => {
                    let bulletHit = false;

                    for (let i = 0; i < currentEnemies.length; i++) {
                        const enemy = currentEnemies[i];
                        const enemyVisualSize = ENEMY_SIZES[enemy.type]; 
                        
                        if (isColliding(bullet, BULLET_SIZE, enemy, enemyVisualSize)) {
                            bulletHit = true;
                            enemy.health -= 1; 
                            if (enemy.health <= 0) {
                                enemy.isAlive = false; 
                                if (Math.random() < DROP_CHANCE) {
                                    const powerupTypes = Object.keys(POWERUP_TYPES);
                                    const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
                                    
                                    nextState.powerups.push({
                                        id: nextState.nextPowerupId++,
                                        x: enemy.x,
                                        y: enemy.y,
                                        type: POWERUP_TYPES[randomType],
                                    });
                                }
                                break; 
                            }
                        }
                    }
                    
                    if (!bulletHit && nextState.boss && nextState.boss.isAlive) {
                        if (isColliding(bullet, BULLET_SIZE, nextState.boss, { width: BOSS_WIDTH, height: BOSS_HEIGHT })) {
                            bulletHit = true;
                            nextState.boss.health -= 1;
                            if (nextState.boss.health <= 0) {
                                nextState.boss.isAlive = false;
                            }
                        }
                    }

                    if (!bulletHit) {
                        remainingBullets.push(bullet);
                    }
                });
                
                nextState.enemies = currentEnemies.filter(e => e.isAlive !== false); 
                nextState.bullets = remainingBullets; 
                
                if (nextState.boss && !nextState.boss.isAlive) {
                    nextState.boss = null; 
                }

                const remainingPowerups = [];
                let newIsInvincible = prev.isInvincible; 

                nextState.powerups.forEach(p => {
                    if (isColliding(nextState.player, PLAYER_SIZE, p, POWERUP_SIZE)) {
                        
                        if (p.type === POWERUP_TYPES.SHIELD) {
                            newIsInvincible = true; 
                            setTimeout(() => {
                                // Usamos uma função de callback para garantir que estamos atualizando o estado mais recente
                                setGameState(current => ({ ...current, isInvincible: false }));
                            }, SHIELD_DURATION);
                        } else if (p.type === POWERUP_TYPES.SPEED) {
                            newFireRateBoostTime = SPEED_DURATION;
                            
                            // ⭐ CORREÇÃO APLICADA: Força o timer de tiro a usar a taxa rápida imediatamente
                            // Isso garante que o tiro rápido comece no próximo frame, e não apenas quando o 
                            // timer de tiro atual de 200ms terminar.
                            newAutoFireTimer = FIRE_RATE_BOOST; 
                            
                        }
                    } else {
                        remainingPowerups.push(p);
                    }
                });
                nextState.powerups = remainingPowerups;
                nextState.isInvincible = newIsInvincible; 
                
                // O estado do autoFireTimer é atualizado AQUI para incluir a mudança imediata
                nextState.autoFireTimer = newAutoFireTimer;
                nextState.fireRateBoostTime = newFireRateBoostTime;
                
                if (!nextState.isInvincible) { 
                    for (const enemy of nextState.enemies) {
                        const enemyVisualSize = ENEMY_SIZES[enemy.type]; 
                        if (isColliding(nextState.player, PLAYER_SIZE, enemy, enemyVisualSize)) {
                            isPlayerHit = true;
                            break;
                        }
                    }
                    
                    if (!isPlayerHit && nextState.boss && nextState.boss.isAlive) {
                        if (isColliding(nextState.player, PLAYER_SIZE, nextState.boss, { width: BOSS_WIDTH, height: BOSS_HEIGHT })) {
                            isPlayerHit = true;
                        }
                    }
                }

                if (isPlayerHit) {
                    return { ...nextState, player: { ...nextState.player, isAlive: false } };
                }
                
                latestPlayerPosRef.current = nextState.player;

                return nextState;
            });
        }, GAME_LOOP_INTERVAL);

        return () => clearInterval(gameLoopRef.current);
    }, [gameState.player.isAlive, gameKey]); 

    const formattedTime = formatTime(gameState.timeSurvived);
    const finalTimeForScore = formatTime(Math.round(gameState.timeSurvived));
    const shieldActive = gameState.isInvincible;
    const speedBoostActive = gameState.fireRateBoostTime > 0;

    const restartGame = () => {
        const newState = getInitialState(screenWidth, screenHeight);
        
        setGameState(newState);
        
        latestPlayerPosRef.current = newState.player; 
        playerPosOnTouchStartRef.current = newState.player; 
        
        setGameKey(prev => prev + 1); 
    };

    return (
        <View key={gameKey} style={styles.container} {...panResponder.panHandlers}>
            {/* HUD */}
            <View style={[styles.hud, { top: insets.top + 10, zIndex: 10 }]}> 
                <Text style={styles.timer}>Onda: {gameState.wave - 1} | Tempo: {formattedTime}</Text>
                
                {/* Status dos Power-ups */}
                <View style={styles.powerupStatusContainer}>
                    {shieldActive && <Text style={styles.statusTextShield}>ESCUDO ATIVO</Text>}
                    {speedBoostActive && <Text style={styles.statusTextSpeed}>RAPIDEZ ATIVA</Text>}
                </View>

                {/* Barra de Vida do Boss */}
                {gameState.boss && gameState.boss.isAlive && (
                    <View style={styles.bossHealthContainer}>
                        <Text style={styles.bossHealthText}>BOSS</Text>
                        <View style={styles.bossHealthBar}>
                            <View style={[
                                styles.bossHealthFill,
                                { width: `${(gameState.boss.health / BOSS_HEALTH) * 100}%` }
                            ]} />
                        </View>
                    </View>
                )}
            </View>

            {/* Renderização do Boss */}
            {gameState.boss && gameState.boss.isAlive && (
                <GameObject
                    x={gameState.boss.x}
                    y={gameState.boss.y}
                    size={{ width: BOSS_WIDTH, height: BOSS_HEIGHT }} 
                    imageSource={bossImage} 
                />
            )}

            {/* Renderização dos Power-ups */}
            {gameState.powerups.map(p => {
                // Se for um Power-up de escudo, não renderizamos uma imagem, mas o jogador já tem o efeito visual.
                // Se você quiser um ícone para ele cair na tela, você pode manter POWERUP_IMAGES[p.type].
                // Por enquanto, vamos manter apenas a imagem do speed powerup.
                if (p.type === POWERUP_TYPES.SHIELD) {
                    // Para o powerup de escudo caindo, podemos usar um círculo azul padrão
                    return (
                        <View
                            key={p.id}
                            style={[
                                styles.powerupDrop,
                                {
                                    left: p.x - POWERUP_SIZE / 2,
                                    top: p.y - POWERUP_SIZE / 2,
                                    width: POWERUP_SIZE,
                                    height: POWERUP_SIZE,
                                    backgroundColor: 'rgba(0,0,255,0.3)', // Fundo azul claro para o drop
                                    borderColor: 'cyan',
                                    borderWidth: 2,
                                    borderRadius: POWERUP_SIZE / 2,
                                }
                            ]}
                        >
                            <Text style={styles.powerupDropText}>S</Text>
                        </View>
                    );
                } else {
                    return (
                        <GameObject
                            key={p.id}
                            x={p.x}
                            y={p.y}
                            size={POWERUP_SIZE} 
                            imageSource={POWERUP_IMAGES[p.type]} 
                        />
                    );
                }
            })}

            {/* Renderização do Player (com feedback visual para invencibilidade) */}
            {gameState.player.isAlive && (
                <GameObject
                    x={gameState.player.x}
                    y={gameState.player.y}
                    size={PLAYER_SIZE} 
                    imageSource={playerImage} 
                    // ⭐ ATUALIZADO: Usando o estilo de escudo visual no próprio player GameObject ⭐
                    style={shieldActive ? styles.playerShieldActive : {}}
                />
            )}

            {/* Inimigos e Balas */}
            {gameState.enemies.map(e => (
                <GameObject
                    key={e.id}
                    x={e.x}
                    y={e.y}
                    size={ENEMY_SIZES[e.type]} 
                    imageSource={ENEMY_IMAGES[e.type]} 
                />
            ))}

            {gameState.bullets.map(b => (
                <GameObject
                    key={b.id}
                    x={b.x}
                    y={b.y}
                    size={BULLET_SIZE} 
                    imageSource={bulletImage} 
                />
            ))}

            {/* Game Over */}
            {!gameState.player.isAlive && (
                <View style={styles.gameOverContainer}>
                    <Text style={styles.gameOverText}>FIM DE JOGO!</Text>
                    <Text style={styles.finalScore}>Você sobreviveu por {finalTimeForScore}.</Text>
                    <TouchableOpacity style={styles.restartButton} onPress={restartGame}>
                        <Text style={styles.restartButtonText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, 
        backgroundColor: '#000', 
        zIndex: 5, 
    },
    // ⭐ NOVO: Estilo para o Escudo no GameObject do Player ⭐
    playerShieldActive: {
        borderColor: 'cyan',
        borderWidth: 4, // Borda mais grossa para o efeito de escudo
        borderRadius: PLAYER_SIZE / 2, // Garante que a borda seja circular
        // Outros efeitos visuais podem ser adicionados aqui, como sombra ou opacidade.
        shadowColor: 'cyan',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 5,
    },
    // ⭐ NOVO: Estilo para o Power-up de Escudo caindo na tela ⭐
    powerupDrop: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    powerupDropText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 24, // Letra 'S' grande para identificar o escudo
    },
    powerupStatusContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 5,
    },
    statusTextShield: {
        color: 'cyan',
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    statusTextSpeed: {
        color: 'yellow', // Cor que indica ativação
        fontSize: 16,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    hud: {
        alignItems: 'center',
        position: 'absolute', 
        width: screenWidth,
        zIndex: 10, 
    },
    timer: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    bossHealthContainer: {
        width: screenWidth * 0.9, 
        alignItems: 'center',
        padding: 5,
        backgroundColor: 'rgba(50, 50, 50, 0.7)',
        borderRadius: 5,
    },
    bossHealthText: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 5,
    },
    bossHealthBar: {
        width: '100%',
        height: 15,
        backgroundColor: '#333',
        borderRadius: 5,
        overflow: 'hidden',
    },
    bossHealthFill: {
        height: '100%',
        backgroundColor: 'red',
    },
    gameOverContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20, 
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