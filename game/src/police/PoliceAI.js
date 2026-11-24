import * as THREE from 'three';

export class PoliceAI {
  constructor(scene, vehicles, collision, state) {
    this.scene = scene; this.vehicles = vehicles; this.collision = collision; this.state = state;
    this.units = []; this.heli = null; this.pinHeli = false; this.searchZone = false; this.material = new THREE.MeshStandardMaterial({ color: '#e9e1ca', roughness: 0.55 });
    this.red = new THREE.MeshStandardMaterial({ color: '#d84c40', emissive: '#9d211a', emissiveIntensity: 1.5 });
    this.blue = new THREE.MeshStandardMaterial({ color: '#4b9fce', emissive: '#174c76', emissiveIntensity: 1.5 });
  }

  createHeli() {
    const root = new THREE.Group(); root.name = 'VBPD air unit';
    // v3: a dark silhouette, not a white box — the staged heli read as a
    // placeholder at capture scale. Dark slate body, dark rotor + blur disc.
    const hull = new THREE.MeshStandardMaterial({ color: '#3a4a55', roughness: 0.55, metalness: 0.25, emissive: '#3a2a18', emissiveIntensity: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.25, 4.4), hull); body.position.y = 9; root.add(body);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.88, 1.65), new THREE.MeshStandardMaterial({ color: '#7d6f5e', emissive: '#2a1c10', emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.3 }));
    cockpit.position.set(0, 9.05, 1.42); root.add(cockpit);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 4.1, 8), hull); tail.rotation.x = Math.PI / 2; tail.position.set(0, 9.08, -3.65); root.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.15, 0.72), hull); fin.position.set(0, 9.5, -5.38); root.add(fin);
    const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.12, 0.7), hull); stabilizer.position.set(0, 9.05, -5.05); root.add(stabilizer);
    for (const x of [-1.25, 1.25]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.8, 6), hull);
      skid.rotation.x = Math.PI / 2; skid.position.set(x, 7.95, 0.1); root.add(skid);
      for (const z of [-1, 1]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), hull);
        strut.position.set(x, 8.3, z); root.add(strut);
      }
    }
    const lamp = new THREE.SpotLight('#fff0b2', 6, 75, Math.PI / 7, 0.5, 1.2);
    lamp.position.set(0, 8.4, 1.8); lamp.target.position.set(0, 0, -5); root.add(lamp, lamp.target);
    const rotorMaterial = new THREE.MeshStandardMaterial({ color: '#141d22', roughness: 0.6 });
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.16), rotorMaterial); rotor.position.y = 9.8; root.add(rotor);
    const crossRotor = new THREE.Mesh(rotor.geometry, rotor.material); crossRotor.rotation.y = Math.PI / 2; rotor.add(crossRotor);
    const discCanvas = document.createElement('canvas'); discCanvas.width = discCanvas.height = 128;
    const dc = discCanvas.getContext('2d');
    const discGradient = dc.createRadialGradient(64, 64, 0, 64, 64, 64);
    discGradient.addColorStop(0, '#ffffff'); discGradient.addColorStop(0.75, '#ffffff'); discGradient.addColorStop(1, '#ffffff00');
    dc.fillStyle = discGradient; dc.fillRect(0, 0, 128, 128);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.1, 28), new THREE.MeshBasicMaterial({ color: '#141d22', transparent: true, opacity: 0.22, alphaMap: new THREE.CanvasTexture(discCanvas), side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 9.82; root.add(disc);
    const beamMaterial = new THREE.MeshStandardMaterial({ color: '#ffe9a6', emissive: '#c9a94f', emissiveIntensity: 1.6, transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
    const searchlight = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 20), beamMaterial); searchlight.renderOrder = 1; root.add(searchlight);
    // v4: a soft pool of light where the beam lands, so the cone's hard
    // base edge dissolves into the road instead of drawing a line.
    const poolCanvas = document.createElement('canvas'); poolCanvas.width = poolCanvas.height = 128;
    const pc = poolCanvas.getContext('2d');
    const poolGradient = pc.createRadialGradient(64, 64, 0, 64, 64, 64);
    poolGradient.addColorStop(0, '#ffffffff'); poolGradient.addColorStop(0.5, '#ffffff88'); poolGradient.addColorStop(1, '#ffffff00');
    pc.fillStyle = poolGradient; pc.fillRect(0, 0, 128, 128);
    const groundPool = new THREE.Mesh(new THREE.CircleGeometry(3.8, 28), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(poolCanvas), color: '#ffedb8', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    groundPool.rotation.x = -Math.PI / 2; groundPool.renderOrder = 2; root.add(groundPool);
    root.scale.setScalar(1.55);
    this.scene.add(root); return { root, lamp, rotor, searchlight, groundPool, offset: { x: 12, y: 0, z: -7 }, beamWidth: 0.26 };
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
    if (level < 3 && this.heli && !this.pinHeli) { this.scene.remove(this.heli.root); this.heli = null; }
  }

  update(dt, level, player) {
    this.ensure(level, player);
    const redPulse = Math.floor(performance.now() / 180) % 2 === 0;
    this.red.emissiveIntensity = redPulse ? 3.5 : 0.8;
    this.blue.emissiveIntensity = redPulse ? 0.8 : 3.5;
    for (const [index, car] of this.units.entries()) {
      const dx = player.target.x - car.position.x; const dz = player.target.z - car.position.z;
      const distance = Math.hypot(dx, dz); const desired = Math.atan2(-dx, -dz);
      let delta = Math.atan2(Math.sin(desired - car.heading), Math.cos(desired - car.heading));
      car.heading += THREE.MathUtils.clamp(delta, -1.8 * dt, 1.8 * dt);
      const speed = car.shotPursuitSpeed ?? Math.min(car.spec.topSpeed * 0.78, 13 + level * 2.5);
      const moveX = -Math.sin(car.heading) * Math.min(distance, speed * dt);
      const moveZ = -Math.cos(car.heading) * Math.min(distance, speed * dt);
      this.collision.move(car.position, moveX, moveZ, car.radius);
      car.speed = speed; this.vehicles.animate(car, dt);
    }
    if (this.heli) {
      const root = this.heli.root;
      const offset = this.heli.offset;
      root.position.set(player.target.x + offset.x, offset.y, player.target.z + offset.z);
      root.rotation.y = player.facing + (this.heli.yawOffset || 0);
      this.heli.rotor.rotation.y += dt * 18;
      root.updateMatrixWorld(true);
      const target = player.target.clone();
      root.worldToLocal(target);
      this.heli.lamp.target.position.copy(target);
      const groundPoint = player.target.clone(); groundPoint.y = 0.14;
      this.heli.groundPool.position.copy(root.worldToLocal(groundPoint));
      this.heli.groundPool.visible = this.heli.searchlight.visible;
      const beam = this.heli.searchlight;
      const start = this.heli.lamp.position;
      const direction = this.heli.lamp.target.position.clone().sub(start);
      const length = direction.length();
      if (length > 0.01) {
        beam.position.copy(start).addScaledVector(direction, 0.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().negate().normalize());
        beam.scale.set(length * (this.heli.beamWidth ?? 0.26), length, length * (this.heli.beamWidth ?? 0.26));
      }
    }
  }

  snapshot() { return { patrolCars: this.units.length, helicopter: Boolean(this.heli), roadblocks: this.state.values.wanted >= 3, searchZone: this.searchZone }; }
}
