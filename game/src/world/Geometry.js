import * as THREE from 'three';

/** Small shared primitive vocabulary; static pieces become instanced draw calls. */
export class GeometryBatch {
  constructor(parent) {
    this.parent = parent;
    this.groups = new Map();
    this.materials = new Map();
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    this.cone = new THREE.ConeGeometry(0.5, 1, 6);
    this.sphere = new THREE.SphereGeometry(0.5, 8, 6);
    this.dummy = new THREE.Object3D();
    this.meshes = [];
  }

  material(color, roughness = 0.85, metalness = 0) {
    const key = `${color}/${roughness}/${metalness}`;
    if (!this.materials.has(key)) {
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
    }
    return this.materials.get(key);
  }

  add(kind, material, position, scale, rotation = [0, 0, 0], shadow = true) {
    const geometry = this[kind];
    const key = `${geometry.uuid}/${material.uuid}/${shadow}`;
    if (!this.groups.has(key)) this.groups.set(key, { geometry, material, shadow, transforms: [] });
    this.dummy.position.set(...position);
    this.dummy.scale.set(...scale);
    this.dummy.rotation.set(...rotation);
    this.dummy.updateMatrix();
    this.groups.get(key).transforms.push(this.dummy.matrix.clone());
  }

  flush() {
    for (const entry of this.groups.values()) {
      const mesh = new THREE.InstancedMesh(entry.geometry, entry.material, entry.transforms.length);
      entry.transforms.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = entry.shadow;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.parent.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
  }
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function labelTexture(title, subtitle, background, ink = '#fff3d7') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const pen = canvas.getContext('2d');
  pen.fillStyle = background;
  pen.fillRect(0, 0, 512, 128);
  pen.strokeStyle = ink;
  pen.lineWidth = 3;
  pen.strokeRect(8, 8, 496, 112);
  pen.fillStyle = ink;
  pen.textAlign = 'center';
  pen.font = 'bold 38px sans-serif';
  const measured = pen.measureText(title).width;
  if (measured > 470) pen.font = `bold ${Math.floor(38 * 470 / measured)}px sans-serif`;
  pen.fillText(title, 256, 62);
  pen.font = '17px sans-serif';
  pen.fillText(subtitle, 256, 98);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function makeSign(parent, title, subtitle, color, position, width = 10, angle = 0) {
  const material = new THREE.MeshStandardMaterial({
    map: labelTexture(title, subtitle, color), roughness: 0.8,
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(width, width / 4, 0.16), material);
  sign.position.set(...position);
  sign.rotation.y = angle;
  parent.add(sign);
  return sign;
}

/** Collapse immobile child boxes by material; preserve articulated siblings. */
export function compactStaticMeshes(group, predicate) {
  const buckets = new Map();
  const meshes = group.children.filter(child => child.isMesh && predicate(child));
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const key = mesh.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: mesh.material, source: [] });
    buckets.get(key).source.push(mesh);
  }
  for (const { material, source } of buckets.values()) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const normalMatrix = new THREE.Matrix3();
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (const mesh of source) {
      const attributes = mesh.geometry.attributes;
      const offset = positions.length / 3;
      normalMatrix.getNormalMatrix(mesh.matrix);
      for (let index = 0; index < attributes.position.count; index++) {
        point.fromBufferAttribute(attributes.position, index).applyMatrix4(mesh.matrix);
        normal.fromBufferAttribute(attributes.normal, index).applyMatrix3(normalMatrix).normalize();
        positions.push(point.x, point.y, point.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(attributes.uv.getX(index), attributes.uv.getY(index));
      }
      const originalIndices = mesh.geometry.index;
      for (let index = 0; index < originalIndices.count; index++) indices.push(offset + originalIndices.getX(index));
      group.remove(mesh);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const combined = new THREE.Mesh(geometry, material);
    combined.castShadow = true;
    combined.receiveShadow = true;
    group.add(combined);
  }
}
