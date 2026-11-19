import * as THREE from 'three';
import { GeometryBatch, seededRandom, makeSign } from './Geometry.js';

/** Street furniture builds a readable human scale around the road network. */
export class Props {
  constructor(scene, city, vehicles, collision, seed = 19) {
    this.group = new THREE.Group();
    this.group.name = 'Street furniture and coastal planting';
    scene.add(this.group);
    this.batch = new GeometryBatch(this.group);
    this.city = city;
    this.vehicles = vehicles;
    this.collision = collision;
    this.random = seededRandom(seed);
    this.counts = { palms: 0, lamps: 0, hydrants: 0, benches: 0, parked: 0 };
    this.build();
  }

  material(color) {
    return this.batch.material(color);
  }

  box(color, x, y, z, w, h, d, angle = 0) {
    this.batch.add('box', this.material(color), [x, y, z], [w, h, d], [0, angle, 0]);
  }

  pole(color, x, y, z, diameter, height) {
    this.batch.add('cylinder', this.material(color), [x, y, z], [diameter, height, diameter]);
  }

  palm(x, z, height = 9, rotation = 0) {
    this.counts.palms++;
    const lean = 0.3;
    this.batch.add('cylinder', this.material('#a9956f'), [x, height / 2, z], [0.5, height, 0.5], [0, 0, lean * 0.15]);
    for (let ring = 1; ring < height; ring += 0.8) {
      this.pole('#8d7c5e', x - ring * 0.045, ring, z, 0.53, 0.08);
    }
    for (let frond = 0; frond < 7; frond++) {
      const angle = rotation + frond * Math.PI * 2 / 7;
      const cx = x + Math.cos(angle) * 1.6;
      const cz = z + Math.sin(angle) * 1.6;
      this.batch.add('box', this.material(frond % 2 ? '#4d7956' : '#648c57'),
        [cx, height + 0.2, cz], [4.5, 0.18, 0.85], [0, -angle, -0.19]);
      this.batch.add('cone', this.material('#688953'),
        [x + Math.cos(angle) * 3.2, height - 0.4, z + Math.sin(angle) * 3.2],
        [1.05, 2.6, 0.2], [0, -angle, 1.08]);
    }
    this.pole('#67774c', x, height + 0.2, z, 0.8, 0.8);
    this.collision.addBox(x, z, 0.5, 0.5, height, 'palm trunk');
  }

  lamp(x, z, angle = 0) {
    this.counts.lamps++;
    this.pole('#486469', x, 3.6, z, 0.18, 7.2);
    this.pole('#547174', x, 0.5, z, 0.4, 1);
    const dx = Math.sin(angle) * 1.2;
    const dz = Math.cos(angle) * 1.2;
    this.box('#486469', x + dx / 2, 7.1, z + dz / 2, 0.16, 0.16, 1.5, angle);
    this.box('#f7deb1', x + dx, 7.05, z + dz, 0.65, 0.18, 1.05, angle);
  }

  hydrant(x, z) {
    this.counts.hydrants++;
    this.pole('#bf6043', x, 0.65, z, 0.4, 1.1);
    this.pole('#d7935b', x, 1.25, z, 0.48, 0.2);
    this.box('#bf6043', x, 0.85, z, 0.8, 0.22, 0.23);
  }

  bench(x, z, angle = 0) {
    this.counts.benches++;
    const root = new THREE.Vector3(x, 0, z);
    const put = (color, dx, y, dz, w, h, d) => {
      const offset = new THREE.Vector3(dx, y, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      this.box(color, root.x + offset.x, y, root.z + offset.z, w, h, d, angle);
    };
    for (const side of [-1, 1]) put('#526365', side * 0.9, 0.45, 0, 0.13, 0.8, 0.7);
    put('#a77b50', 0, 0.85, 0, 2.4, 0.16, 0.7);
    put('#ad8356', 0, 1.3, 0.33, 2.4, 0.75, 0.12);
  }

  bin(x, z) {
    this.pole('#41686a', x, 0.7, z, 0.65, 1.2);
    this.pole('#304f55', x, 1.34, z, 0.72, 0.12);
  }

  signal(x, z, angle) {
    this.pole('#4c6263', x, 2.5, z, 0.14, 5);
    this.box('#384d50', x, 4.4, z, 0.48, 1.35, 0.4, angle);
    // Phase one lights are static street dressing, not a signal simulation.
    this.box('#d68c55', x, 4.74, z + 0.22, 0.23, 0.23, 0.04);
    this.box('#dab661', x, 4.38, z + 0.22, 0.23, 0.23, 0.04);
    this.box('#83b68a', x, 4.02, z + 0.22, 0.23, 0.23, 0.04);
  }

  planters(x, z, accent) {
    this.box('#d4c3a2', x, 0.55, z, 3.5, 0.65, 1.5);
    this.box('#72855c', x, 1.15, z, 3.1, 0.65, 1.15);
    for (let i = -1; i <= 1; i++) {
      this.batch.add('sphere', this.material(accent), [x + i, 1.5, z], [0.5, 0.45, 0.5]);
    }
  }

  umbrella(x, z, color, angle) {
    this.pole('#d0b88e', x, 1.6, z, 0.1, 3.2);
    this.batch.add('cone', this.material(color), [x, 3.15, z], [4.8, 0.8, 4.8], [0, angle, 0]);
    this.box('#eee0be', x, 0.32, z + 1.2, 1.1, 0.2, 2.7, angle);
    this.box('#bb9870', x, 0.2, z + 1.2, 0.12, 0.4, 2.5, angle);
  }

  beachfront() {
    for (let index = 0; index < 18; index++) {
      const z = -240 + index * 29;
      this.umbrella(259 + index % 2 * 8, z,
        ['#d78d6e', '#7ba8a2', '#e2bf7c'][index % 3], index * 0.7);
    }
    // Timber lifeguard huts interrupt the long beach with recognizable silhouettes.
    for (const z of [-100, 155]) {
      for (const dx of [-1.3, 1.3]) {
        for (const dz of [-1.3, 1.3]) this.pole('#ac916b', 271 + dx, 1.2, z + dz, 0.18, 2.4);
      }
      this.box('#8fbcb4', 271, 2.8, z, 3.4, 2.1, 3.4);
      this.box('#e5d9b5', 271, 4, z, 4.4, 0.25, 4.4);
      this.box('#476e77', 271, 3, z + 1.72, 2.6, 0.8, 0.04);
      this.box('#c57153', 271, 3.1, z + 1.76, 0.18, 0.65, 0.03);
      this.box('#c57153', 271, 3.1, z + 1.78, 0.65, 0.18, 0.03);
    }
  }

  marina() {
    for (const dockZ of [-180, 70]) {
      for (let index = 0; index < 4; index++) {
        const x = 264 + index * 13;
        const z = dockZ + (index % 2 ? 9 : -9);
        const color = ['#b76048', '#9abbb5', '#d1b575', '#8c9eaa'][index];
        this.box('#e6d9bc', x, 0.25, z, 3.8, 1.2, 8);
        this.box(color, x, 0.95, z, 3.65, 0.35, 7.7);
        this.box('#eee5cd', x, 1.6, z + 0.7, 2.6, 1.2, 3.5);
        this.box('#527986', x, 1.8, z - 1.1, 2.2, 0.65, 0.08);
        this.pole('#e1d5b8', x, 4, z + 0.8, 0.08, 6.5);
        this.batch.add('box', this.material('#eae0c4'),
          [x + 0.7, 4.3, z + 0.8], [1.3, 3.5, 0.05], [0, 0, -0.12]);
      }
    }
    for (let z = -280; z < 280; z += 18) {
      this.pole('#476368', 228, 0.75, z, 0.25, 1.2);
    }
  }

  parkingBays() {
    // Short curb marks separate parked spaces without painting the travel lane.
    for (const block of this.city.blocks) {
      if ((block.row + block.column) % 3 !== 0) continue;
      for (const offset of [-5, 5]) {
        this.box('#c8cfbb', block.x - 28.4, 0.11, block.z + offset, 2.5, 0.02, 0.12);
      }
      this.box('#c8cfbb', block.x - 29.6, 0.11, block.z, 0.12, 0.02, 10);
    }
  }

  snapshot() {
    return { ...this.counts, batches: this.batch.meshes.length };
  }

  build() {
    for (const block of this.city.blocks) {
      const { x, z, district } = block;
      for (const side of [-1, 1]) {
        this.lamp(x + side * 24.5, z - 18, side * Math.PI / 2);
        this.palm(x + side * 23.8, z + 14, 7.5 + this.random() * 3, this.random() * 6);
      }
      this.hydrant(x + 23, z - 24);
      this.bin(x - 23, z + 23);
      this.bench(x + 9, z + 24.2);
      this.signal(x - 25, z - 25, 0);
      if (district.id === 12) {
        for (let i = -1; i <= 1; i += 2) {
          this.palm(x + i * 12, z - 12, 8);
          this.palm(x + i * 12, z + 12, 9);
        }
      }
      if (block.row % 2 === 0) this.planters(x - 7, z + 24, district.color);
      // One curbside parked car per several blocks keeps lanes usable.
      if ((block.row + block.column) % 3 === 0) {
        this.vehicles.spawn(x - 28.2, z, 0, { model: (block.row + block.column) % 4 });
        this.counts.parked++;
      }
    }
    for (let z = -280; z <= 280; z += 24) {
      this.palm(234, z, 10.5 + this.random() * 1.5, z);
      this.bench(242, z + 6, -Math.PI / 2);
      this.lamp(229, z + 12, Math.PI / 2);
    }
    makeSign(this.group, 'BAY FM', '88.6 / COAST TO COAST', '#bf6851', [13.5, 3, 191], 6, Math.PI / 2);
    // A starter coupe is beside the protagonist, reachable immediately with E.
    this.starterCar = this.vehicles.spawn(220.5, 194, 0, { model: 0, color: '#c64735' });
    this.counts.parked++;
    this.parkingBays();
    this.beachfront();
    this.marina();
    this.batch.flush();
  }
}
