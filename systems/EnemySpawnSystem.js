import Enemy from '../components/Enemy';
import EnemyTwo from '../components/EnemyTwo';
import EnemyThree from '../components/EnemyThree';
import Boss from '../components/Boss';

let enemyId = 0;

const formations = [
  // Formação em V mais larga
  [
    [0, 0], [50, 0], [150, 0], [250, 0], [300, 0],
    [50, 50], [100, 50], [200, 50], [250, 50],
    [150, 100]
  ],
  // Formação em Linha mais larga
  [
    [0, 0], [50, 0], [100, 0], [150, 0], [200, 0], [250, 0], [300, 0]
  ],
  // Nova Formação: Bloco 3x7
  [
    [0, 0], [50, 0], [100, 0], [150, 0], [200, 0], [250, 0], [300, 0],
    [0, 50], [50, 50], [100, 50], [150, 50], [200, 50], [250, 50], [300, 50],
    [0, 100], [50, 100], [100, 100], [150, 100], [200, 100], [250, 100], [300, 100]
  ]
];

const spawnOneFormation = (entities, formation, now, yOffset = 0) => {
  formation.forEach(pos => {
    enemyId++;
    
    const hardEnemyChance = 0.5 + (Math.min(Math.max(0, now - 60000) / 540000, 1) * 0.2);
    const shootingEnemyChance = 0.2;
    
    const rand = Math.random();
    let selectedEnemy, health;
    
    if (rand < shootingEnemyChance) {
      selectedEnemy = EnemyThree;
      health = 2;
    } else if (rand < hardEnemyChance) {
      selectedEnemy = EnemyTwo;
      health = 5;
    } else {
      selectedEnemy = Enemy;
      health = 3;
    }

    entities[`enemy${enemyId}`] = {
      position: [pos[0] + 20, pos[1] - 100 + yOffset],
      health: health,
      renderer: selectedEnemy,
      lastShotTime: 0
    };
  });
};

const EnemySpawnSystem = (entities, { time }) => {
  const now = time.current;

  // Spawna inimigos apenas se o estado do jogo for 'wave'
  if (entities.gameState !== 'wave') {
    return entities;
  }
  
  const baseSpawnInterval = 5000;
  const minSpawnInterval = 500;
  const timeProgress = Math.max(0, now - 30000);
  const timeFactor = Math.min(timeProgress / 600000, 1);
  const spawnInterval = baseSpawnInterval - (baseSpawnInterval - minSpawnInterval) * timeFactor;
  
  if (!entities.lastSpawnTime) entities.lastSpawnTime = 0;
  if (!entities.waveStartTime) entities.waveStartTime = 0;
  
  const enemiesOnScreen = Object.keys(entities).filter(k => k.startsWith('enemy')).length;
  const isTimeForNewWave = now - entities.lastSpawnTime > spawnInterval;

  if (isTimeForNewWave && enemiesOnScreen === 0) {
    entities.lastSpawnTime = now;
    entities.waveStartTime = now;
    
    if (now > 60000) {
      entities.shouldSpawnSecondFormation = true;
      entities.firstFormationTime = now;
    }

    const selectedFormation = formations[Math.floor(Math.random() * formations.length)];
    spawnOneFormation(entities, selectedFormation, now);
  }

  const secondFormationDelay = 500;
  if (entities.shouldSpawnSecondFormation && now - entities.firstFormationTime > secondFormationDelay) {
    const selectedFormation = formations[Math.floor(Math.random() * formations.length)];
    spawnOneFormation(entities, selectedFormation, now, -150); 
    entities.shouldSpawnSecondFormation = false;
  }
  
  return entities;
};

export default EnemySpawnSystem;