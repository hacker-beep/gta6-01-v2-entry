import * as THREE from 'three';
import { seededRandom } from '../world/Geometry.js';

/** Sidewalk walkers use closed block perimeters and a small articulated silhouette. */
export class Pedestrians {
  constructor(scene, city, seed = 407) {
    this.group = new THREE.Group();
    this.group.name = 'Sidewalk life';
    scene.add(this.group);
    this.city = city;
    this.random = seededRandom(seed);
    this.people = [];
    this.elapsed = 0;
    this.enabled = true;
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = new Map();
    this.populate();
    this.buildInstances();
  }

  material(color) {
    if (!this.materials.has(color)) this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    return this.materials.get(color);
  }

  piece(parent, color, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(this.geometry, this.material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  createPerson(index) {
    const root = new THREE.Group();
    const shirt = ['#dfaf64', '#668a91', '#b9655d', '#e5d9b5', '#73856a', '#a68ca5'][index % 6];
    const skin = ['#c58e68', '#885f4c', '#dfac83', '#a77352'][index % 4];
    this.piece(root, shirt, 0, 1.12, 0, 0.46, 0.62, 0.28);
    this.piece(root, skin, 0, 1.62, 0, 0.29, 0.35, 0.29);
    this.piece(root, '#3b3b36', 0, 1.82, 0.02, 0.32, 0.12, 0.32);
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.3, 1.35, 0);
      this.piece(arm, skin, 0, -0.26, 0, 0.14, 0.55, 0.15);
      root.add(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.13, 0.82, 0);
      this.piece(leg, '#485660', 0, -0.32, 0, 0.19, 0.64, 0.23);
      this.piece(leg, '#33434a', 0, -0.65, -0.07, 0.21, 0.12, 0.36);
      root.add(leg);
      limbs.push({ arm, leg, side });
    }
    const scale = 0.9 + this.random() * 0.15;
    root.scale.setScalar(scale);
    // Rig stays off-scene: its matrices feed shared instanced meshes.
    return { root, limbs };
  }

  perimeter(block, reverse) {
    const offset = 23;
    const points = [
      new THREE.Vector3(block.x - offset, 0.36, block.z - offset),
      new THREE.Vector3(block.x + offset, 0.36, block.z - offset),
      new THREE.Vector3(block.x + offset, 0.36, block.z + offset),
      new THREE.Vector3(block.x - offset, 0.36, block.z + offset),
    ];
    if (reverse) points.reverse();
    return points;
  }

  populate() {
    // A few walkers per district, rather than hundreds of invisible downtown actors.
    for (let index = 0; index < 56; index++) {
      const block = this.city.blocks[(index * 13) % this.city.blocks.length];
      const route = this.perimeter(block, index % 2 === 0);
      const segment = index % 4;
      const actor = this.createPerson(index);
      actor.root.position.copy(route[segment]).lerp(route[(segment + 1) % 4], this.random());
      this.people.push({
        ...actor, route, waypoint: (segment + 1) % 4,
        speed: 0.8 + this.random() * 0.65,
        phase: this.random() * Math.PI * 2,
        wait: 0, heading: 0,
      });
    }
  }

  avoidPlayer(person, player) {
    if (!player) return 1;
    const dx = player.position.x - person.root.position.x;
    const dz = player.position.z - person.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 3) return 1;
    const forward = -Math.sin(person.heading) * dx - Math.cos(person.heading) * dz;
    if (forward > 0 && distance < (player.car ? 3 : 1.2)) return 0;
    return 1;
  }

  update(dt, player) {
    if (!this.enabled) return;
    this.elapsed += dt;
    for (const person of this.people) {
      const target = person.route[person.waypoint];
      const dx = target.x - person.root.position.x;
      const dz = target.z - person.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.12) {
        person.waypoint = (person.waypoint + 1) % person.route.length;
        continue;
      }
      person.heading = Math.atan2(-dx, -dz);
      person.root.rotation.y = person.heading;
      const moving = this.avoidPlayer(person, player) * this.separation(person);
      const step = Math.min(distance, person.speed * dt * moving);
      person.root.position.x += dx / distance * step;
      person.root.position.z += dz / distance * step;
      person.phase += dt * person.speed * 6 * moving;
      person.root.position.y = 0.36 + Math.abs(Math.sin(person.phase)) * 0.025 * moving;
      for (const limb of person.limbs) {
        const swing = Math.sin(person.phase) * 0.36 * limb.side * moving;
        limb.arm.rotation.x = swing;
        limb.leg.rotation.x = -swing;
      }
    }
    this.syncInstances();
  }

  buildInstances() {
    this.instanceGroups = new Map();
    for (const person of this.people) {
      person.parts = [];
      person.root.traverse(part => {
        if (!part.isMesh) return;
        const key = part.material.uuid;
        if (!this.instanceGroups.has(key)) this.instanceGroups.set(key, { material: part.material, parts: [] });
        const batch = this.instanceGroups.get(key);
        const reference = { part, batch, index: batch.parts.length };
        batch.parts.push(reference);
        person.parts.push(reference);
      });
    }
    for (const batch of this.instanceGroups.values()) {
      batch.mesh = new THREE.InstancedMesh(this.geometry, batch.material, batch.parts.length);
      batch.mesh.castShadow = true;
      batch.mesh.frustumCulled = false;
      batch.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(batch.mesh);
    }
    this.syncInstances();
  }

  syncInstances() {
    for (const person of this.people) {
      person.root.updateMatrixWorld(true);
      for (const reference of person.parts) {
        reference.batch.mesh.setMatrixAt(reference.index, reference.part.matrixWorld);
      }
    }
    for (const batch of this.instanceGroups.values()) batch.mesh.instanceMatrix.needsUpdate = true;
  }

  separation(person) {
    let closest = 1;
    for (const other of this.people) {
      if (other === person) continue;
      const dx = other.root.position.x - person.root.position.x;
      const dz = other.root.position.z - person.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 1.7 || distance < 0.001) continue;
      const forward = -Math.sin(person.heading) * dx - Math.cos(person.heading) * dz;
      const across = Math.abs(Math.cos(person.heading) * dx - Math.sin(person.heading) * dz);
      if (forward > 0 && across < 0.55) closest = Math.min(closest, Math.max(0.1, (distance - 0.5) / 1.2));
    }
    return closest;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  countNear(position, radius = 25) {
    return this.people.filter(person => person.root.position.distanceTo(position) < radius).length;
  }

  setVisible(visible) {
    this.group.visible = Boolean(visible);
  }

  nearest(position, maximum = 10) {
    let result = null;
    for (const person of this.people) {
      const distance = person.root.position.distanceTo(position);
      if (distance < maximum) { maximum = distance; result = person; }
    }
    return result;
  }

  snapshot() {
    return { count: this.people.length, enabled: this.enabled, drawBatches: this.instanceGroups.size }; 
  }
}
