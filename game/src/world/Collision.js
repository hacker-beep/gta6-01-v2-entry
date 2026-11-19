import * as THREE from 'three';

/** Static AABBs in spatial buckets. Circle sweeps slide along walls rather than tunnel. */
export class Collision {
  constructor(bounds, bucketSize = 48) {
    this.bounds = bounds;
    this.bucketSize = bucketSize;
    this.buckets = new Map();
    this.obstacles = [];
    this.skin = 0.025;
  }

  key(x, z) {
    return `${x},${z}`;
  }

  range(min, max) {
    return [Math.floor(min / this.bucketSize), Math.floor(max / this.bucketSize)];
  }

  addBox(x, z, width, depth, height = 10, label = 'building') {
    const box = {
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: z - depth / 2,
      maxZ: z + depth / 2,
      height,
      label,
    };
    this.obstacles.push(box);
    const [x0, x1] = this.range(box.minX, box.maxX);
    const [z0, z1] = this.range(box.minZ, box.maxZ);
    for (let bx = x0; bx <= x1; bx++) {
      for (let bz = z0; bz <= z1; bz++) {
        const key = this.key(bx, bz);
        if (!this.buckets.has(key)) this.buckets.set(key, []);
        this.buckets.get(key).push(box);
      }
    }
    return box;
  }

  nearby(x, z, radius) {
    const found = new Set();
    const [x0, x1] = this.range(x - radius, x + radius);
    const [z0, z1] = this.range(z - radius, z + radius);
    for (let bx = x0; bx <= x1; bx++) {
      for (let bz = z0; bz <= z1; bz++) {
        for (const box of this.buckets.get(this.key(bx, bz)) || []) found.add(box);
      }
    }
    return found;
  }

  penetration(x, z, radius, box) {
    const nx = THREE.MathUtils.clamp(x, box.minX, box.maxX);
    const nz = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
    const dx = x - nx;
    const dz = z - nz;
    const length = Math.hypot(dx, dz);
    if (length >= radius) return null;
    if (length > 0.00001) {
      const distance = radius - length + this.skin;
      return { x: dx / length * distance, z: dz / length * distance };
    }
    const exits = [
      { distance: x - box.minX, x: -(x - box.minX + radius + this.skin), z: 0 },
      { distance: box.maxX - x, x: box.maxX - x + radius + this.skin, z: 0 },
      { distance: z - box.minZ, x: 0, z: -(z - box.minZ + radius + this.skin) },
      { distance: box.maxZ - z, x: 0, z: box.maxZ - z + radius + this.skin },
    ];
    exits.sort((a, b) => a.distance - b.distance);
    return exits[0];
  }

  isFree(x, z, radius = 0.5) {
    if (x < this.bounds.minX + radius || x > this.bounds.maxX - radius) return false;
    if (z < this.bounds.minZ + radius || z > this.bounds.maxZ - radius) return false;
    for (const box of this.nearby(x, z, radius)) {
      if (this.penetration(x, z, radius, box)) return false;
    }
    return true;
  }

  move(position, dx, dz, radius = 0.5) {
    const startX = position.x;
    const startZ = position.z;
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(0.25, radius * 0.6)));
    let collided = false;
    for (let step = 0; step < count; step++) {
      position.x += dx / count;
      position.z += dz / count;
      for (let iteration = 0; iteration < 3; iteration++) {
        let adjusted = false;
        for (const box of this.nearby(position.x, position.z, radius)) {
          const push = this.penetration(position.x, position.z, radius, box);
          if (!push) continue;
          position.x += push.x;
          position.z += push.z;
          adjusted = collided = true;
        }
        if (!adjusted) break;
      }
      const x = THREE.MathUtils.clamp(position.x, this.bounds.minX + radius, this.bounds.maxX - radius);
      const z = THREE.MathUtils.clamp(position.z, this.bounds.minZ + radius, this.bounds.maxZ - radius);
      if (x !== position.x || z !== position.z) collided = true;
      position.x = x;
      position.z = z;
    }
    return { collided, dx: position.x - startX, dz: position.z - startZ };
  }

  findFreeNear(x, z, radius = 0.5, reach = 12) {
    if (this.isFree(x, z, radius)) return new THREE.Vector3(x, 0, z);
    for (let distance = 1; distance <= reach; distance++) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const px = x + Math.cos(angle) * distance;
        const pz = z + Math.sin(angle) * distance;
        if (this.isFree(px, pz, radius)) return new THREE.Vector3(px, 0, pz);
      }
    }
    return null;
  }

  segmentHit(start, end, radius = 0) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const maximum = direction.length();
    if (maximum < 0.00001) return null;
    direction.divideScalar(maximum);
    const ray = new THREE.Ray(start, direction);
    const centerX = (start.x + end.x) / 2;
    const centerZ = (start.z + end.z) / 2;
    let nearest = null;
    let distance = maximum;
    for (const obstacle of this.nearby(centerX, centerZ, maximum / 2 + radius)) {
      const bounds = new THREE.Box3(
        new THREE.Vector3(obstacle.minX - radius, -radius, obstacle.minZ - radius),
        new THREE.Vector3(obstacle.maxX + radius, obstacle.height + radius, obstacle.maxZ + radius),
      );
      const point = ray.intersectBox(bounds, new THREE.Vector3());
      if (!point) continue;
      const candidate = start.distanceTo(point);
      if (candidate < distance) {
        distance = candidate;
        nearest = { point, distance, label: obstacle.label };
      }
    }
    return nearest;
  }

  lineOfSight(start, end) {
    return this.segmentHit(start, end) === null;
  }

  groundHeight(x, z) {
    // Road and raised sidewalks differ visually; the movement plane stays level.
    if (!this.isWithinBounds(x, z)) return null;
    return 0.32;
  }

  isWithinBounds(x, z, margin = 0) {
    return x >= this.bounds.minX + margin && x <= this.bounds.maxX - margin
      && z >= this.bounds.minZ + margin && z <= this.bounds.maxZ - margin;
  }

  overlaps(x, z, radius = 0.5) {
    const hits = [];
    for (const box of this.nearby(x, z, radius)) {
      if (this.penetration(x, z, radius, box)) hits.push(box.label);
    }
    return hits;
  }

  snapshot() {
    return {
      obstacleCount: this.obstacles.length,
      bucketCount: this.buckets.size,
      bucketSize: this.bucketSize,
      bounds: { ...this.bounds },
    };
  }

  clear() {
    this.obstacles.length = 0;
    this.buckets.clear();
  }

  cameraDistance(origin, direction, maximum) {
    let distance = maximum;
    for (const box of this.nearby(origin.x, origin.z, maximum)) {
      const slab = new THREE.Box3(
        new THREE.Vector3(box.minX - 0.3, 0, box.minZ - 0.3),
        new THREE.Vector3(box.maxX + 0.3, box.height + 0.3, box.maxZ + 0.3),
      );
      const hit = new THREE.Ray(origin, direction).intersectBox(slab, new THREE.Vector3());
      if (hit) distance = Math.min(distance, Math.max(1.1, origin.distanceTo(hit) - 0.5));
    }
    return distance;
  }
}
