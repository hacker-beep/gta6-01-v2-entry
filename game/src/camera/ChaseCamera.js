import * as THREE from 'three';

/** Framerate-independent third-person follow, manual orbit, speed look-ahead, wall test. */
export class ChaseCamera {
  constructor(camera, collision, input) {
    this.camera = camera;
    this.collision = collision;
    this.input = input;
    this.heading = 0;
    this.orbitHeading = 0;
    this.pitch = 0.12;
    this.distanceScale = 1;
    this.lookTarget = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    this.manualTimer = 0;
    this.initialized = false;
    this.enabled = true;
    this.follow = true;
    this.preset = 'chase';
    this.settings = {
      foot: { distance: 8.5, height: 1.4, aimHeight: 1.4, lag: 10 },
      car: { distance: 12.8, height: 2.1, aimHeight: 1.1, lag: 7 },
    };
  }

  angleDelta(from, to) {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
  }

  resize(width, height) {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setPreset(name) {
    if (!['chase', 'wide', 'close'].includes(name)) throw Error(`Unknown camera preset: ${name}`);
    this.preset = name;
    this.distanceScale = name === 'wide' ? 1.65 : name === 'close' ? 0.8 : 1;
  }

  setOrbit(heading, pitch = this.pitch, distanceScale = this.distanceScale) {
    if (![heading, pitch, distanceScale].every(Number.isFinite)) throw Error('Invalid camera orbit');
    this.heading = heading;
    this.orbitHeading = heading;
    this.pitch = THREE.MathUtils.clamp(pitch, -0.05, 0.85);
    this.distanceScale = THREE.MathUtils.clamp(distanceScale, 0.65, 2.4);
    this.manualTimer = 4;
  }

  readInput(dt) {
    const orbit = this.input.consumeCamera();
    if (Math.abs(orbit.x) + Math.abs(orbit.y) > 0.0001) {
      this.heading -= orbit.x;
      this.pitch = THREE.MathUtils.clamp(this.pitch + orbit.y, -0.05, 0.85);
      this.manualTimer = 3;
    }
    this.distanceScale = THREE.MathUtils.clamp(this.distanceScale + orbit.zoom * 0.1, 0.65, 2.4);
    this.manualTimer = Math.max(0, this.manualTimer - dt);
  }

  update(dt, player, snap = false) {
    if (!this.enabled) return;
    this.readInput(dt);
    const driving = Boolean(player.car);
    const mode = driving ? this.settings.car : this.settings.foot;
    if (!this.initialized || snap) this.heading = player.facing;
    if (driving && this.follow && this.manualTimer === 0 && Math.abs(player.speed) > 1) {
      const reverse = player.speed < -1 ? Math.PI : 0;
      const targetHeading = player.facing + reverse;
      this.heading += this.angleDelta(this.heading, targetHeading) * (1 - Math.exp(-2.7 * dt));
      this.pitch = THREE.MathUtils.damp(this.pitch, 0.12, 0.65, dt);
    }
    const speed = Math.abs(player.speed);
    const stretch = driving ? Math.min(3, speed * 0.06) : 0;
    const distance = (mode.distance + stretch) * this.distanceScale;
    const height = mode.height + Math.sin(this.pitch) * distance;
    this.anchor.copy(player.target);
    this.anchor.y += mode.aimHeight;
    const lookAhead = driving ? Math.min(5, speed * 0.11) : 0;
    this.lookTarget.copy(this.anchor);
    this.lookTarget.x -= Math.sin(player.facing) * lookAhead;
    this.lookTarget.z -= Math.cos(player.facing) * lookAhead;
    this.offset.set(Math.sin(this.heading) * distance, height, Math.cos(this.heading) * distance);
    this.direction.copy(this.offset).normalize();
    const safeDistance = this.collision.cameraDistance(this.anchor, this.direction, this.offset.length());
    this.desired.copy(this.anchor).addScaledVector(this.direction, safeDistance);
    if (!this.initialized || snap) {
      this.camera.position.copy(this.desired);
      this.smoothedLook = this.lookTarget.clone();
      this.initialized = true;
    } else {
      const damping = 1 - Math.exp(-mode.lag * dt);
      this.camera.position.lerp(this.desired, damping);
      this.smoothedLook.lerp(this.lookTarget, 1 - Math.exp(-12 * dt));
      // Also test the actual interpolated camera; smoothing must not cross a wall.
      this.direction.subVectors(this.camera.position, this.anchor);
      const current = this.direction.length();
      if (current > 0.01) {
        this.direction.divideScalar(current);
        const safe = this.collision.cameraDistance(this.anchor, this.direction, current);
        if (safe < current) this.camera.position.copy(this.anchor).addScaledVector(this.direction, safe);
      }
    }
    this.camera.lookAt(this.smoothedLook);
    const fov = 59 + (driving ? Math.min(8, speed * 0.2) : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 4, dt);
    this.camera.updateProjectionMatrix();
  }

  snap(player) {
    this.update(0, player, true);
  }

  setModeSettings(mode, options) {
    if (!this.settings[mode]) throw Error('Camera mode must be foot or car');
    const ranges = {
      distance: [3, 30],
      height: [0.5, 12],
      aimHeight: [0.5, 5],
      lag: [1, 30],
    };
    for (const [key, value] of Object.entries(options)) {
      if (!ranges[key] || !Number.isFinite(value)) throw Error(`Invalid camera setting: ${key}`);
      const [minimum, maximum] = ranges[key];
      this.settings[mode][key] = THREE.MathUtils.clamp(value, minimum, maximum);
    }
    return { ...this.settings[mode] };
  }

  resetOrbit(player) {
    this.heading = player.facing;
    this.pitch = 0.12;
    this.distanceScale = 1;
    this.manualTimer = 0;
    this.follow = true;
    this.snap(player);
  }

  worldToScreen(position, width, height) {
    const point = position.clone().project(this.camera);
    return {
      x: (point.x + 1) * width / 2,
      y: (1 - point.y) * height / 2,
      visible: point.z > -1 && point.z < 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1,
    };
  }

  isVisible(position, radius = 0) {
    const matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(matrix);
    return frustum.intersectsSphere(new THREE.Sphere(position, radius));
  }

  groundPoint(screenX, screenY, width, height) {
    const cursor = new THREE.Vector2(screenX / width * 2 - 1, 1 - screenY / height * 2);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(cursor, this.camera);
    return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  }

  savePose() {
    return {
      heading: this.heading,
      pitch: this.pitch,
      distanceScale: this.distanceScale,
      follow: this.follow,
      preset: this.preset,
    };
  }

  restorePose(pose, player) {
    this.setPreset(pose.preset || 'chase');
    this.setOrbit(pose.heading, pose.pitch, pose.distanceScale);
    this.follow = Boolean(pose.follow);
    this.initialized = false;
    // Keep an explicitly supplied orbit rather than resetting it to facing.
    this.anchor.copy(player.target);
    this.update(0, player);
    this.heading = pose.heading;
    this.update(1, player);
  }

  setFollowing(enabled) {
    this.follow = Boolean(enabled);
    this.manualTimer = 0;
  }

  snapshot() {
    return {
      position: this.camera.position.toArray(),
      lookAt: this.smoothedLook?.toArray() || [0, 0, 0],
      heading: this.heading,
      pitch: this.pitch,
      preset: this.preset,
      fov: this.camera.fov,
      follow: this.follow,
    };
  }
}
