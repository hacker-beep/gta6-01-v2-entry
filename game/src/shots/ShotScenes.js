const STAGES = {
  coverHeliChase: { x: 72, z: -72, hour: 17.2, money: 4280, respect: 2, wanted: 3, mission: 2, driving: true, health: 79, ammo: 19, heli: true },
  driveCarjacking: { x: -72, z: 72, hour: 16.4, money: 5350, respect: 4, wanted: 1, mission: 5, driving: true, health: 92, ammo: 22 },
  onFootCombat: { x: 0, z: 0, hour: 17.1, money: 6720, respect: 6, wanted: 2, mission: 11, driving: false, health: 61, ammo: 14, enemies: true, camera: { heading: -0.3, pitch: 0.18, distance: 0.8 } },
  garageEconomy: { x: -72, z: 216, hour: 16.8, money: 12850, respect: 10, wanted: 0, mission: 14, driving: false, health: 100, ammo: 24, garage: true, heading: -Math.PI / 2, camera: { heading: -Math.PI / 2, pitch: 0.14, distance: 1.3 } },
};

export function createShotScenes(app) {
  const stage = name => {
    const config = STAGES[name]; if (!config) throw Error(`Unknown ShotScene: ${name}`);
    const { state, player, vehicles, systems } = app;
    for (const car of [...systems.police.units]) {
      app.scene.remove(car.group);
      app.vehicles.cars.splice(app.vehicles.cars.indexOf(car), 1);
    }
    systems.police.units.length = 0;
    if (systems.police.heli) { app.scene.remove(systems.police.heli.root); systems.police.heli = null; }
    state.teleportPlayer(config.x, config.z, config.heading ?? -0.3);
    state.setTimeOfDay(config.hour); state.setMoney(config.money); state.setRespect(config.respect);
    systems.wanted.heat.clear(); systems.wanted.lastCrime = 0; systems.wanted.setLevel(config.wanted);
    systems.missions.start(config.mission); systems.weapons.health = config.health; systems.weapons.ammo = config.ammo;
    systems.weapons.enemies.forEach(enemy => app.scene.remove(enemy.group)); systems.weapons.enemies.length = 0;
    if (config.enemies) {
      systems.weapons.spawnEnemy(config.x + 4.2, config.z - 6.5, 3);
      systems.weapons.spawnEnemy(config.x - 4.2, config.z - 7.5, 2);
    }
    if (config.driving) {
      let car = player.car;
      if (!car) { car = vehicles.spawn(config.x, config.z, -0.3, { model: 0, color: '#b94737' }); vehicles.acquire(car); player.car = car; player.avatar.visible = false; }
      car.position.set(config.x, 0.12, config.z); car.heading = -0.3; car.speed = name === 'coverHeliChase' ? 20 : 27; car.group.rotation.y = car.heading;
    } else if (player.car) {
      const car = player.car; vehicles.release(car); player.car = null; player.avatar.visible = true; player.position.set(config.x, 0.32, config.z); player.avatar.position.copy(player.position);
    }
    if (name === 'coverHeliChase') {
      systems.wanted.commitCrime(3); systems.wanted.setLevel(3);
      systems.dispatch.messages = [{ callsign: 'Harbor 12', text: 'Air unit has a visual. Road control ahead. All units converge.', district: state.city.districtAt(config.x,config.z).name, age: 0 }];
      systems.police.ensure(3, player);
      systems.police.heli.offset = { x: 8, y: 2, z: -26 };
      app.vehicles.spawn(config.x + 18, config.z + 15, 0, { traffic: true, model: 1 });
    }
    if (name === 'garageEconomy') {
      systems.shops.owned = new Set(['engine','armor','pistol']);
      vehicles.spawn(config.x + 17, config.z, -Math.PI / 2, { model: 0, color: '#d1a44c' });
    }
    systems.missions.dialogue = name === 'coverHeliChase' ? 'INEZ / “The drive is in the trunk. Lose the air unit.”' : systems.missions.dialogue;
    app.chase.snap(player);
    if (name === 'coverHeliChase') app.chase.setOrbit(player.facing, 0.14, 1);
    if (config.camera) app.chase.setOrbit(config.camera.heading, config.camera.pitch, config.camera.distance);
    if (config.camera || name === 'coverHeliChase') app.chase.update(0, player);
    app.sky.update(0, player.target, app.camera); app.renderer.render(app.scene, app.camera);
    return state.snapshot();
  };
  return Object.fromEntries(Object.keys(STAGES).map(name => [name, () => stage(name)]));
}
