import * as THREE from 'three';
import { seededRandom } from '../world/Geometry.js';

/** Lane-based rectangular circuits. No teleporting at junctions or spawning near view. */
export class TrafficAI {
  constructor(vehicles, city, seed = 708) {
    this.vehicles = vehicles;
    this.city = city;
    this.random = seededRandom(seed);
    this.agents = [];
    this.enabled = true;
    this.elapsed = 0;
    this.stats = { moving: 0, stopped: 0 };
    this.populate(24);
  }

  circuit(column, row, width = 1, depth = 1) {
    const xs = this.city.roadsX;
    const zs = this.city.roadsZ;
    const lane = 4.5;
    const x0 = xs[column] + lane;
    const x1 = xs[column + width] - lane;
    const z0 = zs[row] + lane;
    const z1 = zs[row + depth] - lane;
    return [
      new THREE.Vector3(x0, 0.12, z0),
      new THREE.Vector3(x1, 0.12, z0),
      new THREE.Vector3(x1, 0.12, z1),
      new THREE.Vector3(x0, 0.12, z1),
    ];
  }

  populate(count) {
    for (let index = 0; index < count; index++) {
      const column = index % 6;
      const row = Math.floor(index / 6) * 2;
      const width = column < 5 && index % 3 === 0 ? 2 : 1;
      const depth = row < 6 && index % 2 === 0 ? 2 : 1;
      const route = this.circuit(column, row, width, depth);
      const segment = index % 4;
      const start = route[segment];
      const end = route[(segment + 1) % route.length];
      const fraction = 0.15 + this.random() * 0.55;
      const position = start.clone().lerp(end, fraction);
      const heading = Math.atan2(-(end.x - start.x), -(end.z - start.z));
      const car = this.vehicles.spawn(position.x, position.z, heading, { traffic: true, model: index % 4 });
      const agent = {
        car, route, waypoint: (segment + 1) % route.length,
        cruise: 8 + this.random() * 5,
        patience: 0, junctionWait: 0, stopped: false,
      };
      car.route = agent;
      this.agents.push(agent);
    }
  }

  headingDelta(a, b) {
    return Math.atan2(Math.sin(b - a), Math.cos(b - a));
  }

  frontObstacle(agent, player) {
    const car = agent.car;
    const forwardX = -Math.sin(car.heading);
    const forwardZ = -Math.cos(car.heading);
    let clearance = Infinity;
    for (const other of this.vehicles.cars) {
      if (other === car) continue;
      const dx = other.position.x - car.position.x;
      const dz = other.position.z - car.position.z;
      const along = dx * forwardX + dz * forwardZ;
      const across = Math.abs(dx * forwardZ - dz * forwardX);
      if (along > 0 && across < 2.4) clearance = Math.min(clearance, along - 4.7);
    }
    if (player && !player.car) {
      const dx = player.position.x - car.position.x;
      const dz = player.position.z - car.position.z;
      const along = dx * forwardX + dz * forwardZ;
      const across = Math.abs(dx * forwardZ - dz * forwardX);
      if (along > 0 && across < 1.9) clearance = Math.min(clearance, along - 3.5);
    }
    return clearance;
  }

  targetSpeed(agent, distance, clearance) {
    let desired = agent.cruise;
    // Slow for each corner; short circuits remain leisurely neighborhood traffic.
    if (distance < 13) desired = Math.min(desired, 4.5 + distance * 0.22);
    if (clearance < 16) desired = Math.min(desired, Math.max(0, clearance * 0.7));
    return desired;
  }

  update(dt, player) {
    if (!this.enabled) return;
    this.elapsed += dt;
    this.stats.moving = 0;
    this.stats.stopped = 0;
    for (const agent of this.agents) {
      const car = agent.car;
      // A stolen vehicle is permanently detached from its traffic route.
      if (car.owner !== 'traffic') continue;
      let target = agent.route[agent.waypoint];
      let dx = target.x - car.position.x;
      let dz = target.z - car.position.z;
      let distance = Math.hypot(dx, dz);
      if (distance < 2.4) {
        agent.waypoint = (agent.waypoint + 1) % agent.route.length;
        target = agent.route[agent.waypoint];
        dx = target.x - car.position.x;
        dz = target.z - car.position.z;
        distance = Math.hypot(dx, dz);
      }
      const clearance = this.frontObstacle(agent, player);
      agent.junctionWait = Math.max(0, agent.junctionWait - dt);
      const desired = agent.junctionWait > 0 ? 0 : this.targetSpeed(agent, distance, clearance);
      car.speed = THREE.MathUtils.damp(car.speed, desired, desired < car.speed ? 5 : 1.4, dt);
      if (clearance < 1) car.speed = 0;
      agent.stopped = car.speed < 0.3;
      agent.patience = agent.stopped ? agent.patience + dt : 0;
      this.stats[agent.stopped ? 'stopped' : 'moving']++;
      const heading = Math.atan2(-dx, -dz);
      const delta = this.headingDelta(car.heading, heading);
      const turnRate = Math.min(1, dt * 5);
      car.heading += delta * turnRate;
      car.steering = THREE.MathUtils.clamp(-delta, -0.8, 0.8);
      const step = Math.min(distance, car.speed * dt);
      const result = this.vehicles.collision.move(car.position,
        -Math.sin(car.heading) * step, -Math.cos(car.heading) * step, car.radius);
      if (result.collided) car.speed *= 0.7;
      car.brakeGlow = desired < car.speed - 1;
      this.vehicles.animate(car, dt);
    }
  }

  pause(value = true) {
    this.enabled = !value;
  }

  nearestTraffic(position, maximum = 30) {
    let candidate = null;
    let minimum = maximum;
    for (const agent of this.agents) {
      if (agent.car.owner !== 'traffic') continue;
      const distance = agent.car.position.distanceTo(position);
      if (distance < minimum) { minimum = distance; candidate = agent.car; }
    }
    return candidate;
  }

  setCruiseMultiplier(multiplier) {
    if (!Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 2) {
      throw Error('Cruise multiplier must be between 0.1 and 2');
    }
    for (const agent of this.agents) {
      if (!agent.baseCruise) agent.baseCruise = agent.cruise;
      agent.cruise = agent.baseCruise * multiplier;
    }
  }

  yieldAt(position, radius = 12) {
    let stopped = 0;
    for (const agent of this.agents) {
      if (agent.car.owner !== 'traffic') continue;
      if (agent.car.position.distanceTo(position) > radius) continue;
      agent.junctionWait = Math.max(agent.junctionWait, 1.5);
      stopped++;
    }
    return stopped;
  }

  activeCars() {
    return this.agents.filter(agent => agent.car.owner === 'traffic').map(agent => agent.car);
  }

  routeSnapshot() {
    return this.agents.filter(agent => agent.car.owner === 'traffic').map(agent => ({
      id: agent.car.id,
      waypoint: agent.waypoint,
      cruise: agent.cruise,
      stopped: agent.stopped,
      points: agent.route.map(point => ({ x: point.x, z: point.z })),
    }));
  }

  countNear(position, radius = 50) {
    let count = 0;
    for (const agent of this.agents) {
      if (agent.car.owner === 'traffic' && agent.car.position.distanceTo(position) < radius) count++;
    }
    return count;
  }

  releaseStoppedCars() {
    for (const agent of this.agents) {
      agent.junctionWait = 0;
      agent.patience = 0;
    }
  }

  snapshot() {
    return {
      enabled: this.enabled,
      moving: this.stats.moving,
      stopped: this.stats.stopped,
      active: this.agents.filter(agent => agent.car.owner === 'traffic').length,
    };
  }
}
