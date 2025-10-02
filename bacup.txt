import Projectile from '../components/Projectile';
import PowerUp from '../components/PowerUp';
import EnemyThree from '../components/EnemyThree';
import EnemyProjectile from '../components/EnemyProjectile';
import Boss from '../components/Boss';

import { Audio } from 'expo-av';

// ----------------------------------------------------
// 1. IMPORTAÇÃO DOS ARQUIVOS DE SOM
// ----------------------------------------------------
import laserAsset from '../assets/sounds/laser.mp3';
import laserBeamAsset from '../assets/sounds/laser_beam.mp3';
import boostAsset from '../assets/sounds/boost.mp3';

// ----------------------------------------------------
// 2. CONFIGURAÇÕES E POOLS DE SOM
// ----------------------------------------------------
const MAX_SOUND_CHANNELS = 5; 
const soundPools = {
    // Laser normal: 5 canais, volume baixo. 
    // ⭐ MUDANÇA TEMPORÁRIA: durationToPlay: 0 para tocar inteiro
    laser: { pool: [], index: 0, asset: laserAsset, volume: 0.5, durationToPlay: 0 }, 
    
    // Laser Beam: Mantém durationToPlay: 0
    laserBeam: { pool: [], index: 0, asset: laserBeamAsset, volume: 1.0, durationToPlay: 0 }, 
    
    // Boost: Mantém durationToPlay: 0
    boost: { pool: [], index: 0, asset: boostAsset, volume: 1.0, durationToPlay: 0 },
};


let soundsLoaded = false; 

// Função assíncrona para carregar e preencher os pools de sons
async function loadSounds() {
    if (soundsLoaded) return;
    
    try {
        await Audio.setAudioModeAsync({
            allowsRecording: false,
            shouldDuckAndroid: true,
            playsInSilentModeIOS: true,
        });

        for (const key in soundPools) {
            const config = soundPools[key];
            config.pool = [];
            
            for (let i = 0; i < MAX_SOUND_CHANNELS; i++) {
                // Tenta carregar o som e configurar o volume
                const { sound } = await Audio.Sound.createAsync(config.asset, { shouldPlay: false, isLooping: false });
                await sound.setVolumeAsync(config.volume);
                config.pool.push(sound);
            }
            console.log(`✅ Sound Pool '${key}' carregado com ${MAX_SOUND_CHANNELS} canais.`);
        }
        
        soundsLoaded = true;
        console.log('--- Todos os sons carregados com sucesso! ---');
        
    } catch (error) {
        // ⭐ ESTE É O AVISO CRÍTICO ⭐
        console.error('❌ ERRO CRÍTICO ao carregar e configurar o Sound Pool:', error);
        console.warn('Verifique se os paths dos arquivos de áudio estão corretos e acessíveis!');
    }
}

loadSounds(); // Garante que a função é chamada

/**
 * Função auxiliar para tocar um som do pool (Fire-and-Forget).
 * Inicia a reprodução de forma assíncrona para não bloquear o Game Loop.
 * @param {string} soundKey A chave do pool de som (e.g., 'laser', 'boost').
 */
function playSound(soundKey) {
    if (!soundsLoaded) return;
    
    const config = soundPools[soundKey];
    if (!config || config.pool.length === 0) return;
    
    // Pega o próximo som no pool
    const soundObject = config.pool[config.index];
    
    // Atualiza o índice para o próximo uso (circular)
    config.index = (config.index + 1) % MAX_SOUND_CHANNELS;
    
    // ⚡ A execução assíncrona é iniciada e imediatamente executada para não bloquear o Game Loop.
    // É crucial que esta parte use um wrapper async/await para lidar com as funções do Expo.
    (async () => {
        try {
            // 1. Para imediatamente para garantir que o som possa ser reiniciado
            await soundObject.stopAsync();
            
            // 2. Reinicia a reprodução do início
            await soundObject.playFromPositionAsync(0);
            
            // 3. Lógica de corte de som: APENAS para sons curtos como 'laser' (durationToPlay > 0)
            if (config.durationToPlay > 0) {
                // Não usamos 'await' aqui. Isso garante que o jogo não pare para esperar
                // o setTimeout, resolvendo a queda de FPS.
                setTimeout(async () => {
                    try {
                        await soundObject.stopAsync();
                    } catch (e) {
                        // Silencia erros de som que ocorrem durante repetição rápida
                    }
                }, config.durationToPlay);
            }
        } catch (error) {
            // Silencia erros comuns de Promise ou som.
        }
    })(); 
}


let lastTouchX = 0;
let lastTouchY = 0;

const GameSystem = (entities, { touches, time, dispatch }) => {
  const player = entities.player;
  const now = time.current;
  
  // AVISO: Se você notar que os sons demoram a carregar, pode ser útil
  // mostrar uma tela de carregamento até que 'soundsLoaded' seja true.
  if (!soundsLoaded) {
      // Ignora a lógica de jogo pesada ou som se o áudio não estiver carregado.
  }

  // Lógica de Nível
  if (now >= 600000) { 
    player.level = 5;
  } else if (now >= 300000) { 
    player.level = 4;
  } else if (now >= 180000) { 
    player.level = 3;
  } else if (now >= 60000) { 
    player.level = 2;
  } else { 
    player.level = 1;
  }

  // Inicializa o estado do jogo e o contador de chefes
  if (entities.lastShotTime === undefined) {
      entities.lastShotTime = now;
  }
  if (!entities.gameState) {
    entities.gameState = 'wave';
  }
  if (!entities.lastBossSpawnTime) {
    entities.lastBossSpawnTime = now;
  }
  if (!entities.bossSpawnCount) {
      entities.bossSpawnCount = 0;
  }

  // Verifica se é hora de mudar para o estado do chefe
  const bossSpawnInterval = 120000;
  if (entities.gameState === 'wave' && now - entities.lastBossSpawnTime > bossSpawnInterval) {
    entities.gameState = 'boss';
  }

  // Se o estado for 'boss', cria o chefe se ele ainda não existir
  if (entities.gameState === 'boss' && !entities.bossKey) {
    entities.bossSpawnCount++;
    const currentBossHealth = 40 + (entities.bossSpawnCount * 30);
    const bossId = `boss-${Date.now()}`;
    entities[bossId] = {
      position: [0, 50],
      health: currentBossHealth,
      renderer: Boss,
      lastShotTime: 0
    };
    entities.bossKey = bossId;
  }

  // Lógica de movimento da nave (com verificação de segurança)
  const touch = (touches || []).find(t => t.type === 'move');
  if (touch) {
    const screenWidth = 390;
    const screenHeight = 800;
    const playerSize = 50;
    
    const deltaX = touch.event.pageX - lastTouchX;
    const deltaY = touch.event.pageY - lastTouchY;
    
    let newX = player.position[0] + deltaX;
    let newY = player.position[1] + deltaY;

    newX = Math.max(0, Math.min(newX, screenWidth - playerSize));
    newY = Math.max(0, Math.min(newY, screenHeight - playerSize));

    player.position = [newX, newY];
    
    lastTouchX = touch.event.pageX;
    lastTouchY = touch.event.pageY;
  } else if ((touches || []).find(t => t.type === 'start')) {
    const startTouch = (touches || []).find(t => t.type === 'start');
    lastTouchX = startTouch.event.pageX;
    lastTouchY = startTouch.event.pageY;
  }

  // Lógica de Invencibilidade e de Power-Up de tiro rápido
  if (player.isInvincible && now - player.invincibleTimer > 2000) {
    player.isInvincible = false;
  }
  
  // ⚡ Duração do Power-Up: 9 segundos (9000ms)
  if (player.isRapidFire && now - player.rapidFireTimer > 9000) {
      player.isRapidFire = false;
  }
  
  // Lógica para atirar automaticamente (Protagonista)
  let shootInterval = player.isRapidFire ? 200 : 500;
  
  if (player.level > 1) {
    shootInterval -= (player.level - 1) * 50; 
  }

  if (now - entities.lastShotTime > shootInterval) {
    entities.lastShotTime = now;
    
    // ----------------------------------------------------
    // 🎯 CHAMADA DE SOM DE TIRO (USANDO O POOL)
    // ----------------------------------------------------
    if (player.isRapidFire) {
        playSound('laserBeam'); 
    } else {
        playSound('laser'); 
    }

    if (player.level === 2) {
      entities[`projectile${Date.now()}`] = {
        position: [player.position[0] + 5, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 1}`] = {
        position: [player.position[0] + 35, player.position[1]],
        renderer: Projectile
      };
    } else if (player.level === 3) {
      entities[`projectile${Date.now()}`] = {
        position: [player.position[0], player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 1}`] = {
        position: [player.position[0] + 20, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 2}`] = {
        position: [player.position[0] + 40, player.position[1]],
        renderer: Projectile
      };
    } else if (player.level === 4) {
      entities[`projectile${Date.now()}`] = {
        position: [player.position[0], player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 1}`] = {
        position: [player.position[0] + 15, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 2}`] = {
        position: [player.position[0] + 30, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 3}`] = {
        position: [player.position[0] + 45, player.position[1]],
        renderer: Projectile
      };
    } else if (player.level >= 5) {
      entities[`projectile${Date.now()}`] = {
        position: [player.position[0] - 5, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 1}`] = {
        position: [player.position[0] + 10, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 2}`] = {
        position: [player.position[0] + 25, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 3}`] = {
        position: [player.position[0] + 40, player.position[1]],
        renderer: Projectile
      };
      entities[`projectile${Date.now() + 4}`] = {
        position: [player.position[0] + 55, player.position[1]],
        renderer: Projectile
      };
    } else {
      entities[`projectile${Date.now()}`] = {
        position: [player.position[0] + 20, player.position[1]],
        renderer: Projectile
      };
    }
  }

  // Lógica de Movimento de Inimigos e Colisão (apenas no estado 'wave')
  if (entities.gameState === 'wave') {
      const baseEnemySpeed = 2;
      const maxEnemySpeed = 8;
      const timeProgress = Math.max(0, now - 30000); 
      const timeFactor = Math.min(timeProgress / 600000, 1); 
      const enemySpeed = baseEnemySpeed + (maxEnemySpeed - baseEnemySpeed) * timeFactor;
      
      const enemies = Object.keys(entities).filter(k => k.startsWith('enemy'));
      
      enemies.forEach(enemyKey => {
        const enemy = entities[enemyKey];
        enemy.position[1] += enemySpeed;
        
        // Lógica de tiro do EnemyThree
        if (enemy.renderer === EnemyThree && now - enemy.lastShotTime > 1000) {
          enemy.lastShotTime = now;
          const projectileId = `enemy-projectile-${Date.now()}`;
          entities[projectileId] = {
            position: [enemy.position[0] + 20, enemy.position[1] + 50],
            renderer: EnemyProjectile
          };
        }

        if (enemy.position[1] > 800) {
          delete entities[enemyKey];
          return;
        }

        // Colisão do inimigo com o protagonista
        if (!player.isInvincible) {
          const enemyXCenter = enemy.position[0] + 25;
          const enemyYCenter = enemy.position[1] + 25;
          const playerXCenter = player.position[0] + 25;
          const playerYCenter = player.position[1] + 25;

          const distance = Math.sqrt(
            Math.pow(enemyXCenter - playerXCenter, 2) + Math.pow(enemyYCenter - playerYCenter, 2)
          );

          if (distance < 30) {
            dispatch({ type: 'life-lost' });
            player.isInvincible = true;
            player.invincibleTimer = now;
            delete entities[enemyKey]; 
          }
        }
      });
  }

  // Lógica do Chefe (apenas no estado 'boss')
  if (entities.gameState === 'boss') {
      const boss = entities[entities.bossKey];
      
      // Chefe atira em direção ao jogador
      const bossShootInterval = 500;
      if (now - boss.lastShotTime > bossShootInterval) {
          boss.lastShotTime = now;
          const projectileId = `boss-projectile-${Date.now()}`;
          const playerX = player.position[0] + 25;
          const playerY = player.position[1] + 25;
          const bossX = boss.position[0] + 195;
          const bossY = boss.position[1] + 100;

          const angle = Math.atan2(playerY - bossY, playerX - bossX);
          const speed = 7 + (entities.bossSpawnCount * 0.5);
          const vx = speed * Math.cos(angle);
          const vy = speed * Math.sin(angle);

          entities[projectileId] = {
              position: [bossX, bossY],
              renderer: EnemyProjectile,
              vx, vy
          };
      }
  }

  // Lógica de Movimento e Colisão dos Projéteis (Protagonista)
  const projectileSpeed = 10;
  const projectiles = Object.keys(entities).filter(k => k.startsWith('projectile') && !k.startsWith('enemy-projectile') && !k.startsWith('boss-projectile'));
  
  projectiles.forEach(projectileKey => {
    const projectile = entities[projectileKey];
    if (!projectile) return;
    projectile.position[1] -= projectileSpeed;

    // Colisão com o Chefe (hitbox aumentada)
    if (entities.bossKey) {
        const boss = entities[entities.bossKey];
        const bossXCenter = boss.position[0] + 195;
        const bossYCenter = boss.position[1] + 50;
        const projectileXCenter = projectile.position[0] + 7.5;
        const projectileYCenter = projectile.position[1] + 7.5;
        
        const distance = Math.sqrt(
            Math.pow(bossXCenter - projectileXCenter, 2) + Math.pow(bossYCenter - projectileYCenter, 2)
        );
        if (distance < 100) {
            boss.health--;
            delete entities[projectileKey];
            if (boss.health <= 0) {
                delete entities[entities.bossKey];
                delete entities.bossKey;
                entities.gameState = 'wave';
                entities.lastBossSpawnTime = now;
            }
        }
    }

    // Colisão com inimigos normais
    const enemies = Object.keys(entities).filter(k => k.startsWith('enemy'));
    enemies.forEach(enemyKey => {
      const enemy = entities[enemyKey];
      if (!enemy || !projectile) return;

      const enemyXCenter = enemy.position[0] + 25;
      const enemyYCenter = enemy.position[1] + 25;
      const projectileXCenter = projectile.position[0] + 7.5;
      const projectileYCenter = projectile.position[1] + 7.5;

      const distance = Math.sqrt(
        Math.pow(enemyXCenter - projectileXCenter, 2) + Math.pow(enemyYCenter - projectileYCenter, 2)
      );

      if (distance < 25) {
        enemy.health--;
        delete entities[projectileKey];

        if (enemy.health <= 0) {
          if (Math.random() < 0.1) {
            const powerUpType = Math.random() < 0.5 ? 'rapid-fire' : 'life';
            const powerUpId = `powerUp${Date.now()}`;
            entities[powerUpId] = {
              position: [enemy.position[0], enemy.position[1]],
              type: powerUpType,
              renderer: PowerUp
            };
          }
          delete entities[enemyKey];
        }
      }
    });

    if (projectile.position[1] < -20) {
      delete entities[projectileKey];
    }
  });

  // Lógica de Movimento e Colisão dos Projéteis do Inimigo e Chefe
  const enemyProjectileSpeed = 5;
  const allEnemyProjectiles = Object.keys(entities).filter(k => k.startsWith('enemy-projectile') || k.startsWith('boss-projectile'));
  
  allEnemyProjectiles.forEach(projectileKey => {
      const projectile = entities[projectileKey];
      if (!projectile) return;

      if (projectileKey.startsWith('boss-projectile')) {
          projectile.position[0] += projectile.vx;
          projectile.position[1] += projectile.vy;
      } else {
          projectile.position[1] += enemyProjectileSpeed;
      }

      // Colisão do projétil do inimigo com o jogador
      if (!player.isInvincible) {
          const distance = Math.sqrt(
              Math.pow((projectile.position[0] + 7.5) - (player.position[0] + 25), 2) + Math.pow((projectile.position[1] + 7.5) - (player.position[1] + 25), 2)
          );
          if (distance < 30) {
              dispatch({ type: 'life-lost' });
              player.isInvincible = true;
              player.invincibleTimer = now;
              delete entities[projectileKey];
          }
      }
      
      // Remove projéteis que saíram da tela
      if (projectile.position[1] > 800) {
          delete entities[projectileKey];
      }
  });
  
  // Lógica de Movimento de Power-Ups e Colisão com Protagonista
  const powerUpSpeed = 1.5;
  const powerUps = Object.keys(entities).filter(k => k.startsWith('powerUp'));
  powerUps.forEach(powerUpKey => {
    const powerUp = entities[powerUpKey];
    powerUp.position[1] += powerUpSpeed;

    const distance = Math.sqrt(
      Math.pow(powerUp.position[0] - player.position[0], 2) + Math.pow(powerUp.position[1] - player.position[1], 2)
    );

    if (distance < 30) {
      // ----------------------------------------------------
      // 🎯 CHAMADA DE SOM DE POWER-UP (USANDO O POOL)
      // ----------------------------------------------------
      playSound('boost'); 

      if (powerUp.type === 'rapid-fire') {
        player.isRapidFire = true;
        player.rapidFireTimer = now; 
      } else if (powerUp.type === 'life') {
        dispatch({ type: 'life-gained' });
      }
      delete entities[powerUpKey];
    }

    if (powerUp.position[1] > 800) {
        delete entities[powerUpKey];
    }
  });
  
  return entities;
};

export default GameSystem;