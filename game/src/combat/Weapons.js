import * as THREE from 'three';

export class Weapons {
  constructor(scene, player) { this.scene = scene; this.player = player; this.enemies = []; this.selected = 'pistol'; this.ammo = 24; this.health = 100; this.feedback = ''; this.cooldown = 0; }
  spawnEnemy(x, z, health = 3, { aimAt = null, muzzleFlash = false } = {}) {
    const group = new THREE.Group(); group.name = 'Rook crew guard';
    const uniform = new THREE.MeshStandardMaterial({ color: '#344b59', roughness: 0.82 });
    const vest = new THREE.MeshStandardMaterial({ color: '#63716a', roughness: 0.9 });
    const skin = new THREE.MeshStandardMaterial({ color: '#b98968', roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: '#202b31', roughness: 0.85 });
    const makeBox = (parent, material, size, position) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const segment = (parent, material, start, end, width, depth = width) => {
      const from = new THREE.Vector3(...start); const to = new THREE.Vector3(...end);
      const direction = to.clone().sub(from); const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, direction.length(), depth), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    makeBox(group, vest, [0.57, 0.7, 0.32], [0, 1.2, 0]);
    makeBox(group, dark, [0.2, 0.14, 0.34], [0, 1.57, -0.01]);
    makeBox(group, skin, [0.31, 0.34, 0.3], [0, 1.76, 0]);
    makeBox(group, dark, [0.36, 0.14, 0.34], [0, 1.96, 0.01]);
    for (const side of [-1, 1]) {
      const hip = [side * 0.15, 0.85, 0];
      segment(group, uniform, hip, [side * 0.17, 0.1, -0.015], 0.22, 0.25);
      makeBox(group, dark, [0.25, 0.14, 0.37], [side * 0.17, 0.07, -0.055]);
      if (aimAt) {
        const shoulder = [side * 0.29, 1.47, 0];
        segment(group, uniform, shoulder, [side * 0.19, 1.34, -0.31], 0.17, 0.19);
        segment(group, skin, [side * 0.19, 1.34, -0.31], [side * 0.035, 1.37, -0.68], 0.13, 0.15);
      } else {
        segment(group, uniform, [side * 0.29, 1.47, 0], [side * 0.38, 1.05, -0.02], 0.17, 0.19);
        segment(group, skin, [side * 0.38, 1.05, -0.02], [side * 0.36, 0.94, -0.22], 0.13, 0.15);
      }
    }
    const enemy = { group, position: group.position, health, maxHealth: health, alive: true, hitFlash: 0, aiming: Boolean(aimAt) };
    if (aimAt) {
      group.rotation.y = Math.atan2(-(aimAt.x - x), -(aimAt.z - z));
      makeBox(group, dark, [0.13, 0.11, 0.42], [0, 1.39, -0.84]);
      makeBox(group, dark, [0.09, 0.13, 0.15], [0, 1.29, -0.66]);
      if (muzzleFlash) {
        // v4: a radial-gradient additive sprite, not a cartoon star burst.
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
        const c = canvas.getContext('2d');
        const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, '#ffffffff'); gradient.addColorStop(0.25, '#ffedb066');
        gradient.addColorStop(0.6, '#ff9a3d44'); gradient.addColorStop(1, '#ff9a3d00');
        c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
        const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), color: '#ffbd47', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
        flash.scale.set(1.1, 1.1, 1); flash.position.set(0, 1.4, -1.13); group.add(flash);
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), new THREE.MeshBasicMaterial({ color: '#fff4c1', toneMapped: false }));
        core.rotation.x = -Math.PI / 2; core.position.set(0, 1.4, -1.28); group.add(core);
        // Tracer fades along its length: bright at the muzzle, gone at 2 m.
        const traceCanvas = document.createElement('canvas'); traceCanvas.width = 1; traceCanvas.height = 64;
        const t = traceCanvas.getContext('2d');
        const fade = t.createLinearGradient(0, 64, 0, 0);
        fade.addColorStop(0, '#ffffffff'); fade.addColorStop(1, '#ffffff00');
        t.fillStyle = fade; t.fillRect(0, 0, 1, 64);
        const tracer = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.016, 2, 6),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(traceCanvas), color: '#ffbd47', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
        );
        tracer.rotation.x = -Math.PI / 2; tracer.position.set(0, 1.4, -2.1); group.add(tracer);
        const flashLight = new THREE.PointLight('#ffb45e', 20, 8, 1.5);
        flashLight.position.set(0, 1.4, -1.2); group.add(flashLight);
      }
    }
    group.position.set(x, 0, z); this.scene.add(group); this.enemies.push(enemy); return enemy;
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
