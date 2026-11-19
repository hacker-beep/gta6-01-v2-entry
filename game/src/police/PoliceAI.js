import * as THREE from 'three';

export class PoliceAI {
  constructor(scene, vehicles, collision, state) {
    this.scene = scene; this.vehicles = vehicles; this.collision = collision; this.state = state;
    this.units = []; this.heli = null; this.material = new THREE.MeshStandardMaterial({ color: '#e9e1ca', roughness: 0.55 });
    this.red = new THREE.MeshStandardMaterial({ color: '#d84c40', emissive: '#9d211a', emissiveIntensity: 1.5 });
    this.blue = new THREE.MeshStandardMaterial({ color: '#4b9fce', emissive: '#174c76', emissiveIntensity: 1.5 });
  }

  createHeli() {
    const root = new THREE.Group(); root.name = 'VBPD air unit';
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.25, 4.4), this.material); body.position.y = 9; root.add(body);
    const lamp = new THREE.SpotLight('#fff0b2', 2.5, 75, Math.PI / 7, 0.5, 1.2);
    lamp.position.set(0, 8.4, 1.8); lamp.target.position.set(0, 0, -5); root.add(lamp, lamp.target);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.16), this.blue); rotor.position.y = 9.8; root.add(rotor);
    this.scene.add(root); return { root, lamp, rotor };
  }

  ensure(level, player) {
    const desired = level > 0 ? Math.max(2, Math.min(5, level + 1)) : 0;
    while (this.units.length < desired) {
      const angle = this.units.length * 2.399;
      const car = this.vehicles.spawn(player.target.x + Math.cos(angle) * 30, player.target.z + Math.sin(angle) * 30, 0, { model: 0, color: '#ece5d2' });
      car.owner = 'police';
      const bar = new THREE.Group();
      for (const [x, material] of [[-0.38, this.red], [0.38, this.blue]]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.17, 0.3), material); light.position.set(x, 2.07, 0); bar.add(light);
      }
      car.group.add(bar); this.units.push(car);
    }
    while (this.units.length > desired) {
      const car = this.units.pop(); this.scene.remove(car.group); this.vehicles.cars.splice(this.vehicles.cars.indexOf(car), 1);
    }
    if (level >= 3 && !this.heli) this.heli = this.createHeli();
    if (level < 3 && this.heli) { this.scene.remove(this.heli.root); this.heli = null; }
  }

  update(dt, level, player) {
    this.ensure(level, player);
    for (const [index, car] of this.units.entries()) {
      const dx = player.target.x - car.position.x; const dz = player.target.z - car.position.z;
      const distance = Math.hypot(dx, dz); const desired = Math.atan2(-dx, -dz);
      let delta = Math.atan2(Math.sin(desired - car.heading), Math.cos(desired - car.heading));
      car.heading += THREE.MathUtils.clamp(delta, -1.8 * dt, 1.8 * dt);
      const speed = Math.min(car.spec.topSpeed * 0.78, 13 + level * 2.5);
      const moveX = -Math.sin(car.heading) * Math.min(distance, speed * dt);
      const moveZ = -Math.cos(car.heading) * Math.min(distance, speed * dt);
      this.collision.move(car.position, moveX, moveZ, car.radius);
      car.speed = speed; this.vehicles.animate(car, dt);
      for (const child of car.group.children) if (child.isGroup) child.visible = Math.floor(performance.now() / 180) % 2 === index % 2;
    }
    if (this.heli) {
      const root = this.heli.root;
      root.position.set(player.target.x + 12, 0, player.target.z - 7);
      root.rotation.y = player.facing;
      this.heli.rotor.rotation.y += dt * 18;
      this.heli.lamp.target.position.set(player.target.x - root.position.x, 0, player.target.z - root.position.z);
    }
  }

  snapshot() { return { patrolCars: this.units.length, helicopter: Boolean(this.heli), roadblocks: this.state.values.wanted >= 3 }; }
}
