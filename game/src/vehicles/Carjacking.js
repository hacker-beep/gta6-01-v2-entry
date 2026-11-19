import * as THREE from 'three';
import { reflectedLight } from '../render/RoadSheen.js';
import { compactStaticMeshes } from '../world/Geometry.js';

const PALETTE = ['#c9523d', '#e5c87e', '#527e86', '#eee0c2', '#344b59', '#a4829c', '#729889'];
const MODELS = [
  { name: 'Marlin GT', length: 4.6, width: 1.95, topSpeed: 39, acceleration: 16, turn: 1.85 },
  { name: 'Tern Compact', length: 3.8, width: 1.8, topSpeed: 29, acceleration: 13, turn: 2.25 },
  { name: 'Crownline S', length: 5.1, width: 2, topSpeed: 34, acceleration: 12, turn: 1.65 },
  { name: 'Dockhand Van', length: 5.2, width: 2.1, topSpeed: 25, acceleration: 9, turn: 1.4 },
];

/** Owns cars and their possession state, plus the shared lightweight driving model. */
export class Carjacking {
  constructor(scene, collision) {
    this.scene = scene;
    this.collision = collision;
    this.cars = [];
    this.nextId = 1;
    this.materials = new Map();
    this.bodyGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.wheelGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.22, 12);
    this.lastInteraction = null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    const halo = context.createRadialGradient(32,32,0,32,32,32);
    halo.addColorStop(0,'rgba(255,255,255,1)'); halo.addColorStop(0.12,'rgba(255,255,255,.95)');
    halo.addColorStop(0.3,'rgba(255,255,255,.35)'); halo.addColorStop(1,'rgba(255,255,255,0)');
    context.fillStyle=halo; context.fillRect(0,0,64,64);
    this.lightTexture = new THREE.CanvasTexture(canvas);
    this.lampMaterials = [new THREE.MeshStandardMaterial({color:'#fff4c1',emissive:'#ffe8a0',emissiveIntensity:5}),new THREE.MeshStandardMaterial({color:'#ff503b',emissive:'#ff2110',emissiveIntensity:4})];
    this.haloMaterials = ['#ffe4a0','#ff3220'].map(color=>new THREE.SpriteMaterial({map:this.lightTexture,color,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  }

  material(color, metalness = 0) {
    const key = `${color}:${metalness}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: metalness ? 0.36 : 0.72, metalness,
    }));
    return this.materials.get(key);
  }

  piece(group, color, x, y, z, w, h, d, metalness = 0) {
    const mesh = new THREE.Mesh(this.bodyGeometry, this.material(color, metalness));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  spawn(x, z, heading = 0, options = {}) {
    const modelIndex = options.model ?? this.cars.length % MODELS.length;
    const spec = MODELS[modelIndex];
    const color = options.color || PALETTE[this.cars.length % PALETTE.length];
    const group = new THREE.Group();
    group.name = `${spec.name} ${this.nextId}`;
    const { width: w, length: l } = spec;
    this.piece(group, color, 0, 0.72, 0, w, 0.62, l, 0.32);
    this.piece(group, color, 0, 1.03, -l * 0.26, w * 0.96, 0.23, l * 0.34, 0.32);
    this.piece(group, '#304d57', 0, 1.35, l * 0.035, w * 0.84, 0.69, l * 0.43, 0.2);
    this.piece(group, color, 0, 1.73, l * 0.055, w * 0.88, 0.12, l * 0.39, 0.32);
    this.piece(group, color, 0, 1.33, l * 0.07, w * 0.88, 0.72, 0.12, 0.3);
    this.piece(group, '#d4cfb8', 0, 0.57, -l / 2 - 0.05, w, 0.16, 0.15, 0.55);
    this.piece(group, '#b4b8ad', 0, 0.57, l / 2 + 0.05, w, 0.16, 0.15, 0.55);
    this.piece(group, '#e5dcae', 0, 0.76, l / 2 + 0.09, 0.58, 0.2, 0.02);
    for (const side of [-1, 1]) {
      this.piece(group, '#fff1bd', side * w * 0.32, 0.86, -l / 2 - 0.07, 0.44, 0.2, 0.05).material=this.lampMaterials[0];
      this.piece(group, '#b43831', side * w * 0.32, 0.86, l / 2 + 0.07, 0.48, 0.18, 0.05).material=this.lampMaterials[1];
      for (const [index,end] of [[0,-1],[1,1]]) {
        const glow = new THREE.Sprite(this.haloMaterials[index]);
        glow.position.set(side*w*.32,.86,end*(l/2+.13)); glow.scale.setScalar(index===0?1.65:1.35); group.add(glow);
      }
      this.piece(group, color, side * (w / 2 + 0.1), 1.28, -0.35, 0.22, 0.15, 0.3);
    }
    if (modelIndex === 0) {
      // Coupe deck spoiler and hood inlay provide a distinct starter-car silhouette.
      this.piece(group, color, 0, 1.22, l * 0.4, w * 0.93, 0.12, 0.35, 0.3);
      for (const side of [-1, 1]) {
        this.piece(group, '#d9bb85', side * 0.28, 1.152, -l * 0.26, 0.12, 0.015, l * 0.3);
      }
    }
    if (modelIndex === 3) {
      // The delivery van trades rear glass for a taller, solid cargo body.
      this.piece(group, color, 0, 1.45, l * 0.19, w * 0.98, 1.5, l * 0.58);
      this.piece(group, '#ccd0ba', 0, 1.32, l / 2 + 0.08, 0.04, 1.1, 0.03);
    }
    const wheels = [];
    for (const side of [-1, 1]) {
      for (const axle of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * w * 0.48, 0.4, axle * l * 0.31);
        const tire = new THREE.Mesh(this.wheelGeometry, this.material('#263235'));
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        pivot.add(tire);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8), this.material('#b7b9ad', 0.7));
        hub.rotation.z = Math.PI / 2;
        pivot.add(hub);
        group.add(pivot);
        wheels.push({ pivot, tire, hub, front: axle < 0 });
      }
    }
    compactStaticMeshes(group, () => true);
    for (const side of [-1, 1]) {
      for (const [end,color,length] of [[-1,'#ffe2a0',6],[1,'#ff3b21',4.5]]) {
        const reflection=reflectedLight(color,2,length,.9);
        reflection.position.set(side*w*.32,.018,end*(l/2+length*.4));group.add(reflection);
      }
    }
    group.position.set(x, 0.12, z);
    group.rotation.y = heading;
    this.scene.add(group);
    const car = {
      id: this.nextId++, spec, group, wheels,
      position: group.position, heading, speed: 0, steering: 0,
      owner: options.traffic ? 'traffic' : 'parked',
      route: null, radius: 1.4, wheelSpin: 0,
      brakeGlow: false, collisionCooldown: 0,
    };
    this.cars.push(car);
    return car;
  }

  nearest(position, reach = 4.2) {
    let nearest = null;
    let distance = reach;
    for (const car of this.cars) {
      if (car.owner === 'player' || Math.abs(car.speed) > 8) continue;
      const d = Math.hypot(car.position.x - position.x, car.position.z - position.z);
      if (d < distance) { distance = d; nearest = car; }
    }
    return nearest;
  }

  acquire(car) {
    if (!car || car.owner === 'player') return false;
    car.previousOwner = car.owner;
    car.owner = 'player';
    car.route = null;
    car.speed *= 0.35;
    this.lastInteraction = { type: 'enter', car: car.id };
    return true;
  }

  release(car) {
    car.owner = 'parked';
    car.speed = 0;
    car.steering = 0;
    this.lastInteraction = { type: 'exit', car: car.id };
  }

  exitPoint(car) {
    // Try both doors and both bumpers. Never place the player inside a building.
    for (const [side, forward] of [[-1, 0], [1, 0], [0, 3.3], [0, -3.3]]) {
      const offset = side * (car.spec.width / 2 + 1.1);
      const x = car.position.x + Math.cos(car.heading) * offset - Math.sin(car.heading) * forward;
      const z = car.position.z - Math.sin(car.heading) * offset - Math.cos(car.heading) * forward;
      if (!this.collision.isFree(x, z, 0.45)) continue;
      if (this.cars.some(other => other !== car && Math.hypot(other.position.x - x, other.position.z - z) < 2)) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  drive(car, controls, dt) {
    const spec = car.spec;
    const throttle = THREE.MathUtils.clamp(controls.throttle, -1, 1);
    const steerTarget = THREE.MathUtils.clamp(controls.steering, -1, 1);
    car.steering = THREE.MathUtils.damp(car.steering, steerTarget, 9, dt);
    const opposite = throttle && Math.sign(throttle) !== Math.sign(car.speed) && Math.abs(car.speed) > 1;
    const force = opposite ? 23 : spec.acceleration;
    car.speed += throttle * force * dt;
    const drag = controls.brake ? 21 : throttle === 0 ? 2.5 : 0.6;
    car.speed = Math.sign(car.speed) * Math.max(0, Math.abs(car.speed) - drag * dt);
    car.speed = THREE.MathUtils.clamp(car.speed, -spec.topSpeed * 0.36, spec.topSpeed);
    const grip = Math.min(1, Math.abs(car.speed) / 6);
    const speedReduction = 1 - Math.min(0.5, Math.abs(car.speed) / 85);
    // Positive local forward is -Z; turning right decreases heading.
    car.heading -= car.steering * spec.turn * grip * speedReduction * Math.sign(car.speed) * dt;
    const result = this.collision.move(car.position,
      -Math.sin(car.heading) * car.speed * dt,
      -Math.cos(car.heading) * car.speed * dt, car.radius);
    if (result.collided) {
      car.speed *= Math.exp(-12 * dt);
      car.collisionCooldown = 0.25;
    }
    this.resolveVehicles(car);
    car.brakeGlow = controls.brake || opposite;
    car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
    this.animate(car, dt);
  }

  resolveVehicles(car) {
    for (const other of this.cars) {
      if (other === car) continue;
      const dx = car.position.x - other.position.x;
      const dz = car.position.z - other.position.z;
      const d = Math.hypot(dx, dz);
      const limit = car.radius + other.radius;
      if (d >= limit || d < 0.001) continue;
      this.collision.move(car.position, dx / d * (limit - d), dz / d * (limit - d), car.radius);
      car.speed *= 0.8;
      if (other.owner === 'traffic') other.speed *= 0.7;
    }
  }

  animate(car, dt) {
    car.group.rotation.y = car.heading;
    car.wheelSpin += car.speed * dt / 0.39;
    for (const wheel of car.wheels) {
      wheel.pivot.rotation.y = wheel.front ? -car.steering * 0.35 : 0;
      wheel.tire.rotation.x = car.wheelSpin;
      wheel.hub.rotation.x = car.wheelSpin;
    }
  }

  getById(id) {
    return this.cars.find(car => car.id === id) || null;
  }

  parkedCars() {
    return this.cars.filter(car => car.owner === 'parked');
  }

  isDoorClear(car) {
    return this.exitPoint(car) !== null;
  }

  snapshot() {
    return this.cars.map(car => ({ id: car.id, name: car.spec.name, owner: car.owner,
      x: car.position.x, z: car.position.z, speed: car.speed, heading: car.heading }));
  }
}
