import * as THREE from 'three';

export class Weapons {
  constructor(scene, player) { this.scene = scene; this.player = player; this.enemies = []; this.selected = 'pistol'; this.ammo = 24; this.health = 100; this.feedback = ''; this.cooldown = 0; }
  spawnEnemy(x, z, health = 3) {
    const group = new THREE.Group(); group.name = 'Rook crew';
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.9, 3, 7), new THREE.MeshStandardMaterial({ color: '#733f38' })); body.position.y = 1; group.add(body);
    const enemy = { group, position: group.position, health, maxHealth: health, alive: true, hitFlash: 0 };
    group.position.set(x, 0.3, z); this.scene.add(group); this.enemies.push(enemy); return enemy;
  }
  aimTarget(maxDistance = 38) {
    let best = null; let score = maxDistance;
    const direction = new THREE.Vector3(-Math.sin(this.player.facing), 0, -Math.cos(this.player.facing));
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const offset = enemy.position.clone().sub(this.player.target); offset.y = 0;
      const along = offset.dot(direction); const cross = Math.abs(offset.x * direction.z - offset.z * direction.x);
      if (along > 0 && cross < 3.5 && along < score) { best = enemy; score = along; }
    }
    return best;
  }
  attack(kind = this.selected) {
    if (this.player.car) return false;
    const target = this.aimTarget(kind === 'punch' ? 2.5 : 38);
    if (kind === 'pistol' && this.ammo <= 0) { this.feedback = 'OUT OF AMMO'; return false; }
    if (kind === 'pistol') this.ammo--;
    if (target) { target.health--; target.hitFlash = 0.15; if (target.health <= 0) { target.alive = false; target.group.visible = false; } }
    this.feedback = target ? `${kind.toUpperCase()} HIT / ${target.health} HP` : `${kind.toUpperCase()} FIRED`;
    return Boolean(target);
  }
  update(dt, input) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    for (const enemy of this.enemies) if (enemy.alive) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (input?.take('KeyF') && this.cooldown === 0) { this.attack('pistol'); this.cooldown = 0.28; }
    if (input?.take('Space') && !this.player.car && this.cooldown === 0) { this.attack('punch'); this.cooldown = 0.5; }
  }
  snapshot() { return { weapon: this.selected, ammo: this.ammo, health: this.health, enemies: this.enemies.filter(enemy => enemy.alive).length, feedback: this.feedback }; }
}
