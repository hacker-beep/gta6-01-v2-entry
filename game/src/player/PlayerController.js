import * as THREE from 'three';

/** Responsive camera-relative walking and vehicle possession; no combat in phase one. */
export class PlayerController {
  constructor(scene, collision, vehicles, input) {
    this.collision = collision;
    this.vehicles = vehicles;
    this.input = input;
    this.position = new THREE.Vector3(217.4, 0, 194);
    this.heading = 0;
    this.car = null;
    this.velocity = new THREE.Vector3();
    this.gait = 0;
    this.movementSpeed = 0;
    this.interactionCooldown = 0;
    this.lastAction = 'spawn';
    this.enabled = true;
    this.avatar = this.createAvatar();
    this.avatar.position.copy(this.position);
    scene.add(this.avatar);
  }

  createAvatar() {
    const root = new THREE.Group();
    root.name = 'Mara Venn / player';
    const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const jacket = material('#974f3d');
    const skin = material('#c7926c');
    const trousers = material('#314a55');
    const shoe = material('#26373e');
    const piece = (parent, surface, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), surface);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    piece(root, jacket, 0, 1.23, 0, 0.52, 0.7, 0.3);
    piece(root, material('#e5ceaa'), 0, 1.4, -0.17, 0.18, 0.35, 0.04);
    piece(root, skin, 0, 1.78, 0, 0.31, 0.36, 0.3);
    piece(root, material('#3f352f'), 0, 1.95, 0.04, 0.34, 0.17, 0.34);
    piece(root, material('#3f352f'), 0, 1.78, 0.17, 0.32, 0.34, 0.1);
    this.limbs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.35, 1.48, 0);
      piece(arm, jacket, 0, -0.2, 0, 0.18, 0.42, 0.22);
      piece(arm, skin, 0, -0.48, 0, 0.15, 0.19, 0.17);
      root.add(arm);
      const leg = new THREE.Group();
      leg.position.set(side * 0.15, 0.9, 0);
      piece(leg, trousers, 0, -0.35, 0, 0.22, 0.7, 0.25);
      piece(leg, shoe, 0, -0.75, -0.07, 0.24, 0.16, 0.4);
      root.add(leg);
      this.limbs.push({ arm, leg, side });
    }
    return root;
  }

  get target() {
    return this.car ? this.car.position : this.position;
  }

  get facing() {
    return this.car ? this.car.heading : this.heading;
  }

  get speed() {
    return this.car ? this.car.speed : this.movementSpeed;
  }

  interact() {
    if (this.interactionCooldown > 0) return false;
    if (this.car) {
      if (Math.abs(this.car.speed) > 4) {
        this.lastAction = 'slow-down-to-exit';
        return false;
      }
      const exit = this.vehicles.exitPoint(this.car);
      if (!exit) { this.lastAction = 'door-blocked'; return false; }
      this.heading = this.car.heading;
      this.position.copy(exit);
      this.vehicles.release(this.car);
      this.car = null;
      this.avatar.visible = true;
      this.velocity.set(0, 0, 0);
      this.lastAction = 'exited';
    } else {
      const candidate = this.vehicles.nearest(this.position);
      if (!candidate || !this.vehicles.acquire(candidate)) {
        this.lastAction = 'no-car-nearby';
        return false;
      }
      this.car = candidate;
      this.avatar.visible = false;
      this.lastAction = 'entered';
    }
    this.interactionCooldown = 0.3;
    return true;
  }

  update(dt, cameraHeading) {
    if (!this.enabled) return;
    this.interactionCooldown = Math.max(0, this.interactionCooldown - dt);
    if (this.input.take('KeyE')) this.interact();
    if (this.car) {
      this.vehicles.drive(this.car, this.input.driving(), dt);
      this.position.copy(this.car.position);
      this.heading = this.car.heading;
      this.movementSpeed = 0;
      return;
    }
    this.walk(dt, cameraHeading);
  }

  walk(dt, cameraHeading) {
    const move = this.input.movement();
    const maximum = this.input.sprinting() ? 7.5 : 4.4;
    const rightX = Math.cos(cameraHeading);
    const rightZ = -Math.sin(cameraHeading);
    const forwardX = -Math.sin(cameraHeading);
    const forwardZ = -Math.cos(cameraHeading);
    const goalX = (rightX * move.x + forwardX * move.y) * maximum;
    const goalZ = (rightZ * move.x + forwardZ * move.y) * maximum;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, goalX, 17, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, goalZ, 17, dt);
    this.collision.move(this.position, this.velocity.x * dt, this.velocity.z * dt, 0.42);
    this.position.y = 0.32;
    this.movementSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.movementSpeed > 0.2) {
      const target = Math.atan2(-this.velocity.x, -this.velocity.z);
      const delta = Math.atan2(Math.sin(target - this.heading), Math.cos(target - this.heading));
      this.heading += delta * (1 - Math.exp(-18 * dt));
    }
    this.gait += this.movementSpeed * dt * 2.5;
    this.avatar.position.copy(this.position);
    this.avatar.rotation.y = this.heading;
    const amplitude = Math.min(1, this.movementSpeed / 4);
    this.avatar.position.y += Math.abs(Math.sin(this.gait)) * 0.055 * amplitude;
    for (const limb of this.limbs) {
      const swing = Math.sin(this.gait) * 0.65 * amplitude * limb.side;
      limb.arm.rotation.x = swing;
      limb.leg.rotation.x = -swing;
    }
  }

  teleport(x, z, heading = this.heading) {
    const radius = this.car ? this.car.radius : 0.42;
    const destination = this.collision.findFreeNear(x, z, radius);
    if (!destination) throw Error('Teleport destination has no free ground nearby');
    this.position.copy(destination);
    this.heading = heading;
    this.velocity.set(0, 0, 0);
    this.movementSpeed = 0;
    if (this.car) {
      this.car.position.copy(destination);
      this.car.position.y = 0.12;
      this.car.heading = heading;
      this.car.speed = 0;
      this.vehicles.animate(this.car, 0);
    } else {
      this.avatar.position.copy(destination);
      this.avatar.rotation.y = heading;
    }
    return { x: destination.x, z: destination.z, heading };
  }

  canEnterVehicle() {
    return !this.car && this.vehicles.nearest(this.position) !== null;
  }

  canExitVehicle() {
    return Boolean(this.car && Math.abs(this.car.speed) <= 4 && this.vehicles.exitPoint(this.car));
  }

  interactionTarget() {
    if (this.car) {
      return { action: 'exit', available: this.canExitVehicle(), vehicle: this.car.spec.name };
    }
    const car = this.vehicles.nearest(this.position);
    return car ? { action: 'enter', available: true, vehicle: car.spec.name, id: car.id } : null;
  }

  stop() {
    this.velocity.set(0, 0, 0);
    this.movementSpeed = 0;
    if (this.car) {
      this.car.speed = 0;
      this.car.steering = 0;
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stop();
  }

  snapshot() {
    return {
      x: this.target.x, z: this.target.z, heading: this.facing,
      mode: this.car ? 'driving' : 'on-foot', speed: this.speed,
      vehicleId: this.car?.id || null, lastAction: this.lastAction,
    };
  }
}
