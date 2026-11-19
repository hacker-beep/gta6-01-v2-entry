/** The narrow bridge future ShotScenes and phase-two systems can drive. */
export class SceneState {
  constructor({ sky, player, chase, traffic, city, pedestrians, vehicles }) {
    this.sky = sky;
    this.player = player;
    this.chase = chase;
    this.traffic = traffic;
    this.city = city;
    this.pedestrians = pedestrians;
    this.vehicles = vehicles;
    this.values = { money: 0, respect: 0, wanted: 0 };
    this.listeners = new Map();
    this.pendingChase = null;
    this.version = 1;
  }

  on(name, callback) {
    if (typeof callback !== 'function') throw Error('A state listener must be callable');
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(callback);
    return () => this.listeners.get(name)?.delete(callback);
  }

  emit(name, data) {
    for (const callback of this.listeners.get(name) || []) callback(data);
  }

  finite(value, label) {
    if (!Number.isFinite(value)) throw Error(`${label} must be finite`);
    return value;
  }

  setTimeOfDay(hour) {
    const result = this.sky.setTimeOfDay(hour);
    this.emit('time', result);
    return result;
  }

  setMoney(amount) {
    this.values.money = Math.max(0, Math.floor(this.finite(amount, 'Money')));
    this.emit('progress', { ...this.values });
    return this.values.money;
  }

  setRespect(amount) {
    this.values.respect = Math.max(0, this.finite(amount, 'Respect'));
    this.emit('progress', { ...this.values });
    return this.values.respect;
  }

  setWantedLevel(level) {
    this.values.wanted = Math.max(0, Math.min(5, Math.floor(this.finite(level, 'Wanted level'))));
    this.emit('wanted', this.values.wanted);
    return this.values.wanted;
  }

  spawnPoliceChase(options = {}) {
    // This is a request hook, deliberately no police implementation in phase one.
    const request = {
      count: Math.max(1, Math.min(12, Math.floor(this.finite(options.count ?? 3, 'Chase count')))),
      helicopter: Boolean(options.helicopter),
      level: Math.max(1, Math.min(5, Math.floor(this.finite(options.level ?? 3, 'Chase level')))),
    };
    this.pendingChase = request;
    this.emit('police-chase-request', { ...request });
    return { implemented: false, queued: true, request: { ...request } };
  }

  consumeChaseRequest() {
    const request = this.pendingChase;
    this.pendingChase = null;
    return request;
  }

  teleportPlayer(x, z, heading = 0) {
    this.finite(x, 'X');
    this.finite(z, 'Z');
    this.finite(heading, 'Heading');
    const result = this.player.teleport(x, z, heading);
    this.chase.snap(this.player);
    this.emit('teleport', result);
    return result;
  }

  setCamera(options = {}) {
    if (options.preset) this.chase.setPreset(options.preset);
    if (options.follow !== undefined) this.chase.follow = Boolean(options.follow);
    if (options.heading !== undefined) {
      this.chase.setOrbit(options.heading, options.pitch, options.distanceScale);
    }
    return this.chase.snapshot();
  }

  setTrafficEnabled(enabled) {
    this.traffic.enabled = Boolean(enabled);
  }

  snapshot() {
    const district = this.city.districtAt(this.player.target.x, this.player.target.z);
    return {
      version: this.version,
      phase: 1,
      progress: { ...this.values },
      district: { id: district.id, name: district.name },
      player: this.player.snapshot(),
      sky: this.sky.snapshot(),
      camera: this.chase.snapshot(),
      traffic: this.traffic.snapshot(),
      pedestrians: this.pedestrians.snapshot(),
      world: { buildings: this.city.buildingCount, districts: this.city.districts.length },
      pendingChase: this.pendingChase ? { ...this.pendingChase } : null,
    };
  }
}
