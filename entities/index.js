import Player from '../components/Player';

export default function entities() {
  return {
    player: {
      position: [150, 600],
      lives: 3,
      isInvincible: false,
      invincibleTimer: 0,
      isRapidFire: false,
      rapidFireTimer: 0,
      renderer: Player,
      // Novas propriedades para o sistema de nível
      level: 1,
      score: 0
    },
    lastSpawnTime: 0,
    lastShotTime: 0
  };
}