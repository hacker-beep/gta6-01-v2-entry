import * as THREE from 'three';
import { GeometryBatch, seededRandom, makeSign } from './Geometry.js';

// Names and neighborhood identities are design references; all geometry is original.
export const DISTRICTS = [
  { name: 'Glasswake', character: 'sunlit towers', color: '#83c4c6', height: 2.7 },
  { name: 'Cinder Quay', character: 'working docks', color: '#bd7458', height: 0.7 },
  { name: 'Palmetto Steps', character: 'hillside homes', color: '#efbe8b', height: 0.8 },
  { name: 'Bellwether', character: 'old civic core', color: '#e6d6ab', height: 1.4 },
  { name: 'Marrow Beach', character: 'boardwalk', color: '#f69e8e', height: 0.7 },
  { name: 'Cobalt Ward', character: 'night markets', color: '#759fc9', height: 1.1 },
  { name: 'Juniper Point', character: 'marina', color: '#7bbcaf', height: 0.8 },
  { name: 'Saltworks', character: 'industrial flats', color: '#b1b8b0', height: 0.6 },
  { name: 'Crownline', character: 'casino strip', color: '#d4a8bb', height: 2.2 },
  { name: 'Redfern', character: 'warehouse arts', color: '#ce8d75', height: 0.8 },
  { name: 'Lighthouse Row', character: 'cliff road', color: '#eedfc1', height: 1.2 },
  { name: 'Tern Island', character: 'causeway', color: '#9acac7', height: 0.9 },
  { name: 'Morrow Park', character: 'greenway', color: '#a8bd87', height: 0.6 },
  { name: 'South Current', character: 'ferry quarter', color: '#ebbd69', height: 1.0 },
];

export class CityBuilder {
  constructor(scene, collision, seed = 3535377) {
    this.scene = scene;
    this.collision = collision;
    this.random = seededRandom(seed);
    this.group = new THREE.Group();
    this.group.name = 'Vermilion Bay / fourteen districts';
    scene.add(this.group);
    this.batch = new GeometryBatch(this.group);
    this.spacing = 72;
    this.roadWidth = 19;
    this.roadsX = Array.from({ length: 7 }, (_, i) => -216 + i * 72);
    this.roadsZ = Array.from({ length: 9 }, (_, i) => -288 + i * 72);
    this.blocks = [];
    this.districts = DISTRICTS.map((district, id) => ({ ...district, id, blocks: [] }));
    this.buildingCount = 0;
    this.water = null;
    this.build();
  }

  box(color, x, y, z, w, h, d, shadow = true) {
    this.batch.add('box', this.batch.material(color, color === '#515e61' ? 0.14 : 0.85, color === '#515e61' ? 0.35 : 0), [x, y, z], [w, h, d], [0, 0, 0], shadow);
  }

  build() {
    this.ground();
    this.streetGrid();
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 6; column++) {
        // All fourteen districts occupy contiguous pairs or quartets of blocks.
        const id = Math.min(13, Math.floor(row / 2) * 4 + Math.floor(column * 4 / 6));
        const block = {
          x: this.roadsX[column] + 36,
          z: this.roadsZ[row] + 36,
          column, row, district: this.districts[id],
        };
        this.blocks.push(block);
        block.district.blocks.push(block);
        this.buildBlock(block);
      }
    }
    this.coast();
    this.landmarks();
    this.batch.flush();
  }

  ground() {
    this.box('#c8b998', 0, -0.6, 0, 500, 1, 660, false);
    this.box('#d9c28f', 264, -0.3, 0, 40, 0.8, 680, false);
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: '#359eaa', roughness: 0.32, metalness: 0.28,
    });
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), waterMaterial);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(1400, -0.5, 0);
    this.water.receiveShadow = true;
    this.group.add(this.water);
    // Distant sand islands provide a horizon without imported assets.
    for (let i = 0; i < 7; i++) {
      this.box('#98aaa0', 650 + i * 64, 1 + i % 3, -600 + i * 50, 130, 8 + i % 4 * 5, 70, false);
    }
  }

  streetGrid() {
    for (const x of this.roadsX) {
      this.box('#515e61', x, -0.01, 0, this.roadWidth, 0.16, 614, false);
      for (let z = -300; z < 305; z += 9) {
        const junction = this.roadsZ.some(road => Math.abs(road - z) < 13);
        if (junction) continue;
        this.box('#e6c77a', x - 0.17, 0.085, z, 0.12, 0.01, 4, false);
        this.box('#e6c77a', x + 0.17, 0.085, z, 0.12, 0.01, 4, false);
        for (const edge of [-8.3, 8.3]) this.box('#cbd0be', x + edge, 0.085, z, 0.12, 0.01, 7, false);
      }
    }
    for (const z of this.roadsZ) {
      this.box('#515e61', 0, 0, z, 451, 0.18, this.roadWidth, false);
      for (let x = -224; x < 225; x += 9) {
        if (this.roadsX.some(road => Math.abs(road - x) < 13)) continue;
        this.box('#e6c77a', x, 0.1, z, 4, 0.01, 0.16, false);
      }
      for (const x of this.roadsX) {
        for (const side of [-1, 1]) {
          for (let stripe = -3; stripe <= 3; stripe++) {
            this.box('#e3dbc2', x + stripe * 1.6, 0.11, z + side * 11.2, 0.75, 0.01, 2.7, false);
          }
          this.box('#e3dbc2', x + side * 11.2, 0.115, z, 0.3, 0.01, 15, false);
        }
      }
    }
  }

  buildBlock(block) {
    const { x, z, district } = block;
    this.box('#e0d4b9', x, 0.15, z, 52, 0.34, 52, false);
    this.box('#f0dfb9', x, 0.26, z, 49.5, 0.16, 49.5, false);
    // Morrow Park reserves its southern half as a proper public green.
    if (district.id === 12) {
      this.box('#819d65', x, 0.36, z, 43, 0.1, 43, false);
      this.box('#dfcba5', x, 0.42, z, 4, 0.02, 44, false);
      this.box('#dfcba5', x, 0.42, z, 44, 0.02, 4, false);
      this.box('#a7c7c2', x, 0.8, z, 10, 0.9, 10);
      return;
    }
    const industrial = [1, 7, 9].includes(district.id);
    for (let bx = -1; bx <= 1; bx++) {
      for (let bz = -1; bz <= 1; bz++) {
        if (bx === 0 && bz === 0) continue;
        if (this.random() < 0.12) continue;
        const width = 10 + this.random() * 3;
        const depth = 10 + this.random() * 3;
        const height = industrial ? 7 + this.random() * 5 : (7 + this.random() * 15) * district.height;
        const px = x + bx * 14;
        const pz = z + bz * 14;
        const tint = new THREE.Color(district.color);
        // Quantized variations retain color variety while sharing instanced materials.
        tint.offsetHSL(0, 0.07, (Math.floor(this.random() * 4) - 1.5) * 0.045);
        this.building(px, pz, width, height, depth, '#' + tint.getHexString(), district);
      }
    }
  }

  building(x, z, width, height, depth, color, district) {
    this.buildingCount++;
    this.box(color, x, height / 2 + 0.4, z, width, height, depth);
    this.collision.addBox(x, z, width, depth, height + 0.8, district.name);
    this.box('#f0dec3', x, height + 0.55, z, width + 0.5, 0.35, depth + 0.5);
    this.box('#a9a59a', x + 1, height + 1.1, z + 1, 2.6, 1, 2);
    // Recessed-looking window ribbons use a single instanced material.
    const glazing = district.id === 0 ? '#467781' : '#506971';
    for (let floor = 2.8; floor < height - 0.5; floor += 3.3) {
      for (const side of [-1, 1]) {
        this.box(glazing, x, floor, z + side * (depth / 2 + 0.015), width * 0.79, 1.45, 0.035, false);
        this.box(glazing, x + side * (width / 2 + 0.015), floor, z, 0.035, 1.45, depth * 0.76, false);
        this.box('#f1d9b5', x, floor - 0.82, z + side * (depth / 2 + 0.1), width + 0.25, 0.16, 0.25, false);
      }
    }
    if (height < 20) {
      this.box(district.color, x, 3, z + depth / 2 + 0.9, width * 0.9, 0.22, 1.9);
      this.box('#355a5e', x, 1.5, z + depth / 2 + 0.035, 1.5, 2.5, 0.05, false);
    }
  }

  coast() {
    this.box('#e0ceb0', 236, 0.15, 0, 17, 0.45, 620, false);
    this.box('#f4e0ba', 246, 0.6, 0, 1, 1.2, 620);
    for (let z = -300; z < 310; z += 24) {
      this.box('#f9e9cb', 246, 1.4, z, 1.6, 2.5, 1.6);
      for (let i = 0; i < 3; i++) this.box('#e9dcc4', 246, 0.9 + i * 0.4, z + 12, 0.35, 0.12, 24);
    }
    for (const z of [-180, 70]) {
      this.box('#9f8869', 280, 0.6, z, 70, 0.8, 8);
      for (let x = 252; x < 315; x += 10) this.box('#756d5e', x, -1, z, 0.8, 5, 7);
    }
  }

  landmarks() {
    for (const district of this.districts) {
      const block = district.blocks[0];
      if (!block) continue;
      makeSign(this.group, district.name.toUpperCase(), district.character.toUpperCase(), district.color,
        [block.x, 5.2, block.z + 26.3], 13);
    }
    makeSign(this.group, 'VERMILION BAY', 'THE COAST IS CLEAR. FOR NOW.', '#28565d', [237, 7, 180], 17, -Math.PI / 2);
    makeSign(this.group, 'KITE & KEY', 'MOTOR WORKS / REDFERN', '#a3543f', [-36, 4.2, 242.5], 11);
    // A tall beacon at the shore gives the skyline a recognizable silhouette.
    this.batch.add('cylinder', this.batch.material('#f2ddbd'), [238, 9, -260], [5, 18, 5]);
    this.batch.add('cylinder', this.batch.material('#bd6e53'), [238, 16, -260], [5.2, 2, 5.2]);
    this.batch.add('cone', this.batch.material('#38585d'), [238, 20, -260], [7, 4, 7]);
    this.collision.addBox(238, -260, 5, 5, 22, 'lighthouse');
  }

  districtAt(x, z) {
    let closest = this.blocks[0];
    let minimum = Infinity;
    for (const block of this.blocks) {
      const distance = (x - block.x) ** 2 + (z - block.z) ** 2;
      if (distance < minimum) { minimum = distance; closest = block; }
    }
    return closest.district;
  }

  nearestRoad(x, z) {
    const rx = this.roadsX.reduce((a, b) => Math.abs(a - x) < Math.abs(b - x) ? a : b);
    const rz = this.roadsZ.reduce((a, b) => Math.abs(a - z) < Math.abs(b - z) ? a : b);
    return Math.abs(rx - x) < Math.abs(rz - z) ? { x: rx, z } : { x, z: rz };
  }
}
