import * as THREE from 'three';
import { Input } from './core/Input.js';
import { SceneState } from './core/SceneState.js';
import { ChaseCamera } from './camera/ChaseCamera.js';
import { SkyAndSun } from './render/SkyAndSun.js';
import { CityBuilder } from './world/CityBuilder.js';
import { Props } from './world/Props.js';
import { Collision } from './world/Collision.js';
import { PlayerController } from './player/PlayerController.js';
import { Carjacking } from './vehicles/Carjacking.js';
import { TrafficAI } from './traffic/TrafficAI.js';
import { Pedestrians } from './people/Pedestrians.js';
import { WantedSystem } from './police/WantedSystem.js';
import { PoliceDispatch } from './police/PoliceDispatch.js';
import { PoliceAI } from './police/PoliceAI.js';
import { MissionDirector } from './missions/MissionDirector.js';
import { Weapons } from './combat/Weapons.js';
import { ShopsAndGarage } from './economy/ShopsAndGarage.js';
import { Reputation } from './economy/Reputation.js';
import { Hud } from './ui/Hud.js';
import { Minimap } from './ui/Minimap.js';
import { Menus } from './ui/Menus.js';
import { SaveGame } from './core/SaveGame.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { createShotScenes } from './shots/ShotScenes.js';

/** Composition root and fixed-step simulation. Each subsystem owns one concern. */
class VermilionBay {
  constructor(canvas) {
    this.canvas = canvas;
    this.disposed = false;
    this.paused = false;
    this.fixedStep = 1 / 60;
    this.accumulator = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.ticks = 0;
    this.frame = 0;
    this.maxSteps = 5;
    this.params = new URLSearchParams(location.search);
    const candidate = Number(this.params.get('seed') || 3535377);
    this.seed = Number.isFinite(candidate) ? candidate >>> 0 : 3535377;
    this.setupRenderer();
    this.setupWorld();
    this.setupEvents();
    this.installDebugBridge();
    this.resize();
    this.chase.snap(this.player);
    this.sky.update(0, this.player.target, this.camera);
    this.renderer.render(this.scene, this.camera);
    document.getElementById('loading').hidden = true;
    this.canvas.focus();
    const sceneName = this.params.get('scene');
    if (sceneName) {
      const selectScene = Object.hasOwn(this.shotScenes, sceneName) ? this.shotScenes[sceneName] : null;
      if (!selectScene) throw Error(`Unknown scene: ${sceneName}`);
      selectScene();
      window.__shotReady = true;
    }
    this.renderer.setAnimationLoop(time => this.animate(time));
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.name = 'Vermilion Bay / Low Tide';
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2200);
    this.input = new Input(this.canvas);
  }

  setupWorld() {
    this.collision = new Collision({ minX: -232, maxX: 245, minZ: -307, maxZ: 307 });
    this.city = new CityBuilder(this.scene, this.collision, this.seed);
    this.vehicles = new Carjacking(this.scene, this.collision);
    this.props = new Props(this.scene, this.city, this.vehicles, this.collision, this.seed + 1);
    this.player = new PlayerController(this.scene, this.collision, this.vehicles, this.input);
    this.traffic = new TrafficAI(this.vehicles, this.city, this.seed + 2);
    this.pedestrians = new Pedestrians(this.scene, this.city, this.seed + 3);
    this.chase = new ChaseCamera(this.camera, this.collision, this.input);
    this.sky = new SkyAndSun(this.scene, this.renderer);
    this.state = new SceneState({
      sky: this.sky, player: this.player, chase: this.chase,
      traffic: this.traffic, city: this.city,
      pedestrians: this.pedestrians, vehicles: this.vehicles,
    });
    this.systems = {
      wanted: new WantedSystem(this.state, this.city), dispatch: new PoliceDispatch(),
      police: new PoliceAI(this.scene, this.vehicles, this.collision, this.state),
      missions: new MissionDirector(this.state), weapons: new Weapons(this.scene, this.player),
      shops: new ShopsAndGarage(this.state, this.player), reputation: new Reputation(this.state),
      hud: new Hud(), minimap: new Minimap(), audio: new AudioEngine(),
    };
    this.menus = new Menus(value => this.setPaused(value));
    this.systems.save = new SaveGame(this.state, this.systems.missions, this.systems.shops, this.systems.reputation);
    this.state.wantedSystem = this.systems.wanted;
    this.state.attachSystems(this.systems);
    this.shotScenes = createShotScenes(this);
    this.systems.missions.start(0);
    const hour = this.params.get('hour');
    if (hour !== null && Number.isFinite(Number(hour))) this.sky.setTimeOfDay(Number(hour));
  }

  setupEvents() {
    this.onResize = () => this.resize();
    this.onVisibility = () => {
      this.accumulator = 0;
      this.lastTime = 0;
      this.input.clear();
    };
    this.onLost = event => {
      event.preventDefault();
      this.paused = true;
      const loading = document.getElementById('loading');
      loading.textContent = 'GRAPHICS CONTEXT LOST / RELOAD TO CONTINUE';
      loading.hidden = false;
    };
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.canvas.addEventListener('webglcontextlost', this.onLost);
  }

  installDebugBridge() {
    const state = this.state;
    const app = this;
    // Public data is copied; systems remain reachable for browser development only.
    window.game = {
      state,
      ready: true,
      version: 'phase-2',
      snapshot: () => ({ ...state.snapshot(), simulation: { ticks: app.ticks, paused: app.paused },
        render: { calls: app.renderer.info.render.calls, triangles: app.renderer.info.render.triangles } }),
      setTimeOfDay: hour => state.setTimeOfDay(hour),
      setMoney: amount => state.setMoney(amount),
      setRespect: amount => state.setRespect(amount),
      setWantedLevel: level => state.setWantedLevel(level),
      commitCrime: severity => state.commitCrime(severity),
      startMission: index => app.systems.missions.start(index),
      advanceMission: () => app.systems.missions.advance(),
      buyUpgrade: id => app.systems.shops.buy(id),
      save: () => app.systems.save.save(),
      load: () => app.systems.save.load(),
      ShotScenes: app.shotScenes,
      systems: app.systems,
      spawnPoliceChase: options => state.spawnPoliceChase(options),
      teleportPlayer: (x, z, heading) => state.teleportPlayer(x, z, heading),
      setCamera: options => state.setCamera(options),
      pause: value => app.setPaused(value),
      step: frames => app.manualStep(frames),
      vehicles: app.vehicles,
      player: app.player,
      collision: app.collision,
    };
    window.dispatchEvent(new CustomEvent('vermilion-ready', { detail: { version: state.version } }));
  }

  resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.chase.resize(width, height);
    if (this.paused) this.renderer.render(this.scene, this.camera);
  }

  setPaused(value = !this.paused) {
    this.paused = Boolean(value);
    this.accumulator = 0;
    this.input.clear();
    return this.paused;
  }

  simulate(dt) {
    this.player.update(dt, this.chase.heading);
    this.traffic.update(dt, this.player);
    this.pedestrians.update(dt, this.player);
    const level = this.state.values.wanted;
    this.systems.police.update(dt, level, this.player);
    this.systems.wanted.update(dt, this.systems.police.units.length > 0);
    const district = this.city.districtAt(this.player.target.x, this.player.target.z);
    this.systems.dispatch.update(dt, this.state.values.wanted, district.name);
    this.systems.weapons.update(dt, this.input);
    this.vehicleFire?.update(dt);
    this.systems.missions.update(dt);
    this.systems.reputation.update();
    this.systems.hud.update({ ...this.state.snapshot(), vehicleName: this.player.car?.spec.name || '' }, this.city, this.systems.dispatch, this.systems.police);
    this.elapsed += dt;
    this.ticks++;
  }

  manualStep(frames = 1) {
    if (!this.paused) throw Error('Pause before manually stepping');
    if (!Number.isFinite(frames)) throw Error('Step count must be finite');
    const count = Math.max(1, Math.min(600, Math.floor(frames)));
    for (let i = 0; i < count; i++) this.simulate(this.fixedStep);
    this.chase.update(count * this.fixedStep, this.player);
    this.sky.update(count * this.fixedStep, this.player.target, this.camera);
    this.renderer.render(this.scene, this.camera);
    return this.state.snapshot();
  }

  animate(timestamp) {
    if (this.disposed) return;
    const seconds = timestamp / 1000;
    const delta = this.lastTime ? Math.min(0.1, Math.max(0, seconds - this.lastTime)) : 0;
    this.lastTime = seconds;
    this.frame++;
    this.input.poll();
    if (this.input.take('KeyP')) this.setPaused();
    if (this.input.take('KeyK')) this.systems.save.save();
    if (!this.paused && !document.hidden) {
      this.accumulator += delta;
      let steps = 0;
      while (this.accumulator >= this.fixedStep && steps < this.maxSteps) {
        this.simulate(this.fixedStep);
        this.accumulator -= this.fixedStep;
        steps++;
      }
      if (steps === this.maxSteps) this.accumulator = 0;
      this.chase.update(delta, this.player);
      this.sky.update(delta, this.player.target, this.camera);
      if (steps) this.input.endFrame();
    }
    if (!this.paused) this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.input.dispose();
    this.sky.dispose();
    this.systems.audio.dispose();
    const geometries = new Set();
    const materials = new Set();
    this.scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
      material.map?.dispose();
      material.dispose();
    });
    this.vehicleFire?.dispose(this.scene);
    this.renderer.dispose();
    window.game.ready = false;
  }
}

window.__shotReady = false;
try {
  new VermilionBay(document.getElementById('world'));
} catch (error) {
  const loading = document.getElementById('loading');
  loading.textContent = `Unable to start Vermilion Bay: ${error.message}`;
  console.error(error);
}
