import { VehicleFire } from '../render/VehicleFire.js';
import { reflectedLight } from '../render/RoadSheen.js';

// Phase 7: rank-1-scale money with a rising arc across shots, golden-hour
// clocks on every shot, and driving headings near the road axis so the
// faster staged cars stay on the asphalt through the capture settle.
const STAGES = {
  coverHeliChase: { x: 66, z: -72, hour: 17.2, money: 86250, respect: 2, wanted: 3, mission: 2, driving: true, health: 79, ammo: 19, heli: true, heading: -0.15, speed: 34 },
  driveCarjacking: { x: -72, z: 72, hour: 17.3, money: 92300, respect: 4, wanted: 1, mission: 5, driving: true, health: 92, ammo: 22, heading: -0.12, speed: 38.5 },
  onFootCombat: { x: 0, z: 0, hour: 17.1, money: 104750, respect: 6, wanted: 2, mission: 11, driving: false, health: 61, ammo: 14, enemies: true, camera: { heading: -0.3, pitch: 0.18, distance: 0.8 } },
  garageEconomy: { x: -72, z: 216, hour: 17.4, money: 128900, respect: 10, wanted: 0, mission: 14, driving: false, health: 100, ammo: 24, garage: true, heading: -Math.PI / 2, camera: { heading: -Math.PI / 2, pitch: 0.14, distance: 0.8 } },
};

// Sidewalk spots in frame at capture time (the staged car travels ~40 m
// during the settle, so spots sit ahead of the stage position).
const CROWD_SPOTS = {
  coverHeliChase: [[60, -100], [84, -102], [60, -115], [84, -118], [60, -130], [84, -128]],
  driveCarjacking: [[-60, 20], [-84, 18], [-60, 5], [-84, 2], [-60, -10], [-84, -12]],
  onFootCombat: [[-11, -12], [11, -14], [-11, -25], [11, -28], [-12, -40], [12, -38]],
  garageEconomy: [[-55, 205], [-40, 227], [-25, 205], [-5, 227], [15, 205], [35, 227]],
};

// Extra traffic in frame at capture. Parked/ownerless cars hold still, so
// they sit clear of the player car's lane through the settle.
const STAGED_TRAFFIC = {
  coverHeliChase: [
    { x: 78, z: -125, heading: 0.15, model: 1 }, { x: 68, z: -138, heading: -0.1, model: 2 },
    { x: 50, z: -144, heading: Math.PI / 2, model: 3 }, { x: 96, z: -144, heading: -Math.PI / 2, model: 0 },
  ],
  driveCarjacking: [
    { x: -78, z: 8, heading: -0.1, model: 2 }, { x: -68, z: -4, heading: 0.12, model: 0 },
    { x: -40, z: 0, heading: Math.PI / 2, model: 1 }, { x: -104, z: 0, heading: -Math.PI / 2, model: 3 },
  ],
  onFootCombat: [
    { x: 5, z: -26, heading: -0.1, model: 1 }, { x: -5, z: -42, heading: 0.1, model: 2 },
    { x: -20, z: -72, heading: Math.PI / 2, model: 0 }, { x: 16, z: -72, heading: -Math.PI / 2, model: 3 },
  ],
  garageEconomy: [
    { x: -40, z: 212, heading: -Math.PI / 2, model: 1 }, { x: -10, z: 220, heading: Math.PI / 2, model: 2 },
    { x: 25, z: 211, heading: -Math.PI / 2, model: 0 }, { x: 55, z: 219, heading: Math.PI / 2, model: 3 },
  ],
};

export function createShotScenes(app) {
  const stage = name => {
    const config = STAGES[name]; if (!config) throw Error(`Unknown ShotScene: ${name}`);
    const { state, player, vehicles, systems } = app;
    app.vehicleFire?.dispose(app.scene); app.vehicleFire = null;
    if (app.sunGlare) { app.scene.remove(app.sunGlare); app.sunGlare = null; }
    if (app.burnedCar) {
      app.scene.remove(app.burnedCar.group);
      vehicles.cars.splice(vehicles.cars.indexOf(app.burnedCar), 1); app.burnedCar = null;
    }
    for (const car of [...systems.police.units]) {
      app.scene.remove(car.group);
      app.vehicles.cars.splice(app.vehicles.cars.indexOf(car), 1);
    }
    systems.police.units.length = 0;
    if (systems.police.heli) { app.scene.remove(systems.police.heli.root); systems.police.heli = null; }
    systems.police.pinHeli = false;
    systems.police.searchZone = name === 'garageEconomy';
    state.teleportPlayer(config.x, config.z, config.heading ?? -0.3);
    state.setTimeOfDay(config.hour); state.setMoney(config.money); state.setRespect(config.respect);
    systems.wanted.heat.clear(); systems.wanted.lastCrime = 0; systems.wanted.setLevel(config.wanted);
    systems.missions.start(config.mission); systems.weapons.health = config.health; systems.weapons.ammo = config.ammo;
    systems.weapons.enemies.forEach(enemy => app.scene.remove(enemy.group)); systems.weapons.enemies.length = 0;
    if (config.enemies) {
      systems.weapons.spawnEnemy(config.x + 4.2, config.z - 6.5, 3, { aimAt: player.target, muzzleFlash: true });
      systems.weapons.spawnEnemy(config.x - 4.2, config.z - 7.5, 2, { aimAt: player.target });
    }
    if (config.enemies) {
      app.burnedCar = vehicles.spawn(config.x + 7.5, config.z - 17, -0.65, { model: 0, color: '#302c29' });
      app.vehicleFire = new VehicleFire(app.scene, config.x + 7.5, config.z - 18);
    }
    if (config.driving) {
      let car = player.car;
      if (!car) { car = vehicles.spawn(config.x, config.z, config.heading ?? -0.3, { model: 0, color: '#b94737' }); vehicles.acquire(car); player.car = car; player.avatar.visible = false; }
      car.position.set(config.x, 0.12, config.z); car.heading = config.heading ?? -0.3; car.speed = config.speed ?? 20; car.group.rotation.y = car.heading;
      // A broad warm streak on the wet asphalt ahead of the car, riding with
      // it through the settle so it is still in frame at capture.
      if (!car.sunGlare) {
        car.sunGlare = reflectedLight('#ff9a4d', 7, 55, 0.2);
        car.sunGlare.position.set(0, 0.02, -30);
        car.group.add(car.sunGlare);
      }
    } else if (player.car) {
      const car = player.car; vehicles.release(car); player.car = null; player.avatar.visible = true; player.position.set(config.x, 0.32, config.z); player.avatar.position.copy(player.position);
    }
    // The air unit is pinned for every shot: ensure() would otherwise drop
    // it below wanted 3, and the staged heli is part of each frame.
    const stageHeli = (scale, offset, yaw, beamWidth, beamOpacity, beamVisible = true) => {
      if (!systems.police.heli) systems.police.heli = systems.police.createHeli();
      systems.police.pinHeli = true;
      systems.police.heli.root.scale.setScalar(scale);
      systems.police.heli.offset = offset;
      systems.police.heli.yawOffset = yaw;
      if (beamWidth) systems.police.heli.beamWidth = beamWidth;
      if (beamOpacity) systems.police.heli.searchlight.material.opacity = beamOpacity;
      systems.police.heli.searchlight.visible = beamVisible;
    };
    if (name === 'coverHeliChase') {
      systems.wanted.commitCrime(3); systems.wanted.setLevel(3);
      systems.dispatch.messages = [{ callsign: 'Harbor 12', text: 'Air unit has a visual. Road control ahead. All units converge.', district: state.city.districtAt(config.x,config.z).name, age: 0 }];
      systems.police.ensure(3, player);
      stageHeli(2.8, { x: 2, y: -13.5, z: -15 }, 0.65);
      const pursuit = systems.police.units[0];
      pursuit.position.set(player.target.x + Math.sin(player.facing) * 8, 0.12, player.target.z + Math.cos(player.facing) * 8);
      pursuit.heading = player.facing; pursuit.shotPursuitSpeed = 33; app.vehicles.animate(pursuit, 0);
      // Two static units hold a roadblock ahead of the capture point.
      const blockers = [[68, -138, 0.5], [78, -152, -0.4]];
      for (let i = 0; i < blockers.length && systems.police.units[i + 1]; i++) {
        const unit = systems.police.units[i + 1];
        unit.position.set(blockers[i][0], 0.12, blockers[i][1]);
        unit.heading = blockers[i][2]; unit.shotPursuitSpeed = 0; app.vehicles.animate(unit, 0);
      }
    }
    if (name === 'driveCarjacking') {
      systems.police.ensure(config.wanted, player);
      stageHeli(2.6, { x: -2, y: -12, z: -18 }, 0.5, 0.22);
      const pursuit = systems.police.units[0];
      pursuit.position.set(player.target.x + Math.sin(player.facing) * 9, 0.12, player.target.z + Math.cos(player.facing) * 9);
      pursuit.heading = player.facing; pursuit.shotPursuitSpeed = 37; app.vehicles.animate(pursuit, 0);
      if (systems.police.units[1]) {
        const unit = systems.police.units[1];
        unit.position.set(-68, 0.12, 0); unit.heading = 0.4; unit.shotPursuitSpeed = 0; app.vehicles.animate(unit, 0);
      }
    }
    if (name === 'onFootCombat') {
      stageHeli(2.6, { x: -2, y: -16.9, z: -25 }, 0.9, 0.12, 0.16, false);
      app.sunGlare = reflectedLight('#ff9a4d', 7, 55, 0.2);
      app.sunGlare.position.set(0, 0.12, -35);
      app.scene.add(app.sunGlare);
    }
    if (name === 'garageEconomy') {
      systems.shops.owned = new Set(['engine', 'armor', 'pistol', 'nitrous']);
      vehicles.spawn(config.x + 1, config.z - 2.8, -0.5, { model: 0, color: '#d1a44c' });
      stageHeli(2.2, { x: 28, y: -12, z: 0 }, 0.9, 0.18, 0.2, false);
      app.sunGlare = reflectedLight('#ff9a4d', 7, 55, 0.2);
      app.sunGlare.position.set(-20, 0.12, 216);
      app.sunGlare.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      app.scene.add(app.sunGlare);
    }
    // Denser streets: staged traffic and a sidewalk crowd in frame.
    for (const staged of STAGED_TRAFFIC[name]) {
      vehicles.spawn(staged.x, staged.z, staged.heading, { traffic: true, model: staged.model });
    }
    const spots = CROWD_SPOTS[name];
    const people = app.pedestrians.people;
    let block = state.city.blocks[0]; let best = Infinity;
    for (const candidate of state.city.blocks) {
      const d = (candidate.x - config.x) ** 2 + (candidate.z - config.z) ** 2;
      if (d < best) { best = d; block = candidate; }
    }
    for (let i = 0; i < spots.length && i < people.length; i++) {
      const person = people[i];
      person.route = app.pedestrians.perimeter(block, i % 2 === 0);
      person.waypoint = 0;
      person.root.position.set(spots[i][0], 0.36, spots[i][1]);
    }
    systems.missions.dialogue = name === 'coverHeliChase' ? 'INEZ / “The drive is in the trunk. Lose the air unit.”' : systems.missions.dialogue;
    app.chase.snap(player);
    if (name === 'coverHeliChase') app.chase.setOrbit(player.facing, 0.14, 1.35);
    if (name === 'driveCarjacking') app.chase.setOrbit(player.facing, 0.14, 1.4);
    if (config.camera) app.chase.setOrbit(config.camera.heading, config.camera.pitch, config.camera.distance);
    if (config.camera || name === 'coverHeliChase' || name === 'driveCarjacking') app.chase.update(0, player);
    app.sky.update(0, player.target, app.camera); app.renderer.render(app.scene, app.camera);
    return state.snapshot();
  };
  return Object.fromEntries(Object.keys(STAGES).map(name => [name, () => stage(name)]));
}
