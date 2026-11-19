import * as THREE from 'three';

const SKY_VERTEX = `
  varying vec3 viewDirection;
  void main() {
    viewDirection = position;
    vec4 projected = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = projected.xyww;
  }
`;
const SKY_FRAGMENT = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunDirection;
  uniform vec3 solarColor;
  varying vec3 viewDirection;
  void main() {
    vec3 direction = normalize(viewDirection);
    float altitude = max(0.0, direction.y);
    vec3 color = mix(horizon, zenith, pow(altitude, 0.48));
    float alignment = max(0.0, dot(direction, sunDirection));
    float glow = pow(alignment, 18.0) * 0.35;
    float disc = smoothstep(0.9993, 0.99965, alignment);
    color += solarColor * (glow + disc * 1.5);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** A procedural sky dome, directional shadow sun, coastal haze, and explicit clock. */
export class SkyAndSun {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.hour = 17.4;
    this.dayRate = 0;
    this.time = 0;
    this.sunDirection = new THREE.Vector3();
    this.focus = new THREE.Vector3();
    this.uniforms = {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDirection: { value: this.sunDirection },
      solarColor: { value: new THREE.Color('#ffe3a7') },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1800, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide, depthWrite: false,
      }),
    );
    this.sky.name = 'Procedural coastal atmosphere';
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    scene.add(this.sky);
    this.ambient = new THREE.HemisphereLight('#cbdde0', '#b4a58c', 2.5);
    scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#ffcc88', 3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -85;
    this.sun.shadow.camera.right = 85;
    this.sun.shadow.camera.top = 85;
    this.sun.shadow.camera.bottom = -85;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 450;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.bias = -0.00015;
    this.sun.shadow.radius = 2;
    scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog('#e8b38a', 120, 650);
    this.setTimeOfDay(this.hour);
  }

  setTimeOfDay(hour) {
    if (!Number.isFinite(hour)) throw Error('Time of day must be a finite hour');
    this.hour = ((hour % 24) + 24) % 24;
    const arc = (this.hour - 6) / 12 * Math.PI;
    const elevation = Math.sin(arc);
    const daylight = THREE.MathUtils.smoothstep(elevation, -0.13, 0.22);
    const golden = 1 - THREE.MathUtils.smoothstep(Math.max(0, elevation), 0.15, 0.65);
    // Sunset toward the northwest, visible along the principal boulevards.
    this.sunDirection.set(-Math.cos(arc) * 0.65, Math.max(-0.2, elevation), -0.75).normalize();
    const nightZenith = new THREE.Color('#142b48');
    const dayZenith = new THREE.Color('#76b7cc');
    const warmZenith = new THREE.Color('#d69a82');
    const dayHorizon = new THREE.Color('#d7ddd1');
    const warmHorizon = new THREE.Color('#ff934d');
    const nightHorizon = new THREE.Color('#63586b');
    dayZenith.lerp(warmZenith, golden * 0.75);
    dayHorizon.lerp(warmHorizon, golden);
    this.uniforms.zenith.value.copy(nightZenith).lerp(dayZenith, daylight);
    this.uniforms.horizon.value.copy(nightHorizon).lerp(dayHorizon, daylight);
    this.uniforms.solarColor.value.set(golden > 0.5 ? '#ffe1a1' : '#fff8dc');
    this.sun.color.set('#fff4d9').lerp(new THREE.Color('#ffb864'), golden);
    this.sun.intensity = daylight * (2.8 + golden * 0.6);
    this.ambient.intensity = 0.6 + daylight * 2.3;
    this.ambient.color.set('#9bbdca').lerp(new THREE.Color('#d6bba0'), golden * 0.35);
    this.ambient.groundColor.set('#b8a989');
    this.scene.fog.color.copy(this.uniforms.horizon.value);
    this.renderer.toneMappingExposure = 0.9 + daylight * 0.12;
    this.sun.visible = elevation > -0.12;
    return this.hour;
  }

  setGoldenHour() {
    return this.setTimeOfDay(17.4);
  }

  setClockRate(hoursPerSecond = 0) {
    if (!Number.isFinite(hoursPerSecond)) throw Error('Clock rate must be finite');
    this.dayRate = hoursPerSecond;
  }

  update(dt, target, camera) {
    this.time += dt;
    if (this.dayRate) this.setTimeOfDay(this.hour + this.dayRate * dt);
    this.sky.position.copy(camera.position);
    // Shadow camera travels on a coarse grid to suppress crawling shadow texels.
    this.focus.set(Math.round(target.x / 4) * 4, 0, Math.round(target.z / 4) * 4);
    this.sun.target.position.copy(this.focus);
    this.sun.position.copy(this.focus).addScaledVector(this.sunDirection, 220);
    this.sun.target.updateMatrixWorld();
  }

  setFogRange(near, far) {
    if (!Number.isFinite(near) || !Number.isFinite(far) || near < 1 || far <= near) {
      throw Error('Fog needs a positive near plane below its far plane');
    }
    this.scene.fog.near = near;
    this.scene.fog.far = far;
    return { near, far };
  }

  setShadowQuality(quality) {
    const sizes = { low: 1024, medium: 2048, high: 4096 };
    const size = sizes[quality];
    if (!size) throw Error('Shadow quality must be low, medium or high');
    this.sun.shadow.mapSize.set(size, size);
    if (this.sun.shadow.map) {
      this.sun.shadow.map.dispose();
      this.sun.shadow.map = null;
    }
    this.sun.shadow.needsUpdate = true;
  }

  setShadowCoverage(radius) {
    if (!Number.isFinite(radius) || radius < 25 || radius > 200) throw Error('Shadow radius outside 25–200');
    const camera = this.sun.shadow.camera;
    camera.left = -radius;
    camera.right = radius;
    camera.top = radius;
    camera.bottom = -radius;
    camera.updateProjectionMatrix();
  }

  clockLabel() {
    const hour = Math.floor(this.hour);
    const minute = Math.floor((this.hour - hour) * 60);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  isGoldenHour() {
    return this.sunDirection.y > 0 && this.sunDirection.y < 0.3;
  }

  getLightingAtGround() {
    return {
      sunDirection: this.sunDirection.toArray(),
      sunlight: this.sun.intensity,
      ambient: this.ambient.intensity,
      exposure: this.renderer.toneMappingExposure,
      warm: this.isGoldenHour(),
      clock: this.clockLabel(),
    };
  }

  setShadowsEnabled(enabled) {
    this.sun.castShadow = Boolean(enabled);
    this.renderer.shadowMap.needsUpdate = true;
  }

  snapshot() {
    return {
      hour: this.hour,
      clockRate: this.dayRate,
      sunElevation: this.sunDirection.y,
      sunColor: '#' + this.sun.color.getHexString(),
      fogNear: this.scene.fog.near,
      fogFar: this.scene.fog.far,
    };
  }

  dispose() {
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.sun.shadow.map?.dispose();
    this.scene.remove(this.sky, this.sun, this.sun.target, this.ambient);
  }
}
