# Vermilion Bay: Low Tide — 3D core

[![make.fun GTA6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Live rank](https://make.fun/badge/gta6-01/hacker-beep/gta6-01-v2-entry/rank.svg)](https://make.fun/competitions/gta6-01)
[![Live reward](https://make.fun/badge/gta6-01/hacker-beep/gta6-01-v2-entry/reward.svg)](https://make.fun/competitions/gta6-01)

An original three.js coastal city scaffold for make.fun's “Make GTA 6” competition.
Phase one delivers the playable world and movement foundation. No title screen:
Mara Venn begins beside a red Marlin GT on a golden-hour boulevard.

## Run offline

With Node 22.18+ (or Node 24), run `node serve.ts`, then open
`http://127.0.0.1:8080/game/index.html` (the root URL works too).
There is no build step or runtime network dependency. Any static server rooted
at `game/` also works. JavaScript modules require HTTP rather than `file://`.

WASD / arrows move relative to the camera on foot. Shift sprints. E enters a
nearby parked or slow traffic car, then exits after slowing below 4 m/s.
W/S accelerate, brake, and reverse; A/D steer; Space applies the handbrake.
Drag to orbit, wheel to adjust follow distance, P to pause. Gamepad left stick
moves/steers; triggers drive/reverse, A brakes, Y enters/exits, right stick orbits,
and Start pauses. Connect the controller and press a button to activate it.

## World and structure

The deterministic city contains fourteen named neighborhoods: Glasswake,
Cinder Quay, Palmetto Steps, Bellwether, Marrow Beach, Cobalt Ward, Juniper Point,
Saltworks, Crownline, Redfern, Lighthouse Row, Tern Island, Morrow Park, and
South Current. Their palettes and massing vary from pastel beach buildings to
glass towers, industrial sheds, and a public green. District names and character
carry over as design; source code is freshly authored for this entry.

`game/src/main.js` composes independent modules:

- `core/Input.js`: keyboard/gamepad edges, axes, camera gestures, focus cleanup.
- `core/SceneState.js`: small validated state and event bridge for later systems.
- `camera/ChaseCamera.js`: smooth follow, orbit, speed look-ahead, wall avoidance.
- `render/SkyAndSun.js`: shader sky, warm low sun, traveling shadows, haze, clock.
- `world/CityBuilder.js`: seeded blocks, roads, crossings, skyline and waterfront.
- `world/Geometry.js`: shared instancing and procedural sign textures.
- `world/Props.js`: palms, lamps, planters, benches, signs and parked cars.
- `world/Collision.js`: spatial buckets, circle sweeps, sliding and camera rays.
- `player/PlayerController.js`: animated walking, sprinting and vehicle possession.
- `vehicles/Carjacking.js`: original procedural cars, handling and door checks.
- `traffic/TrafficAI.js`: lane circuits, corner slowing and front-obstacle braking.
- `people/Pedestrians.js`: articulated walkers following sidewalk perimeters.

Static furniture and buildings are instanced. Moving actors use shared geometry
and materials. Physics advances at 60 Hz with bounded catch-up. Traffic yields
to other cars and the on-foot player. Collision is deliberately approximate:
vehicles use circular footprints and pedestrians are ambient sidewalk actors.

## Phase-two integration

The browser exposes `window.game` after `vermilion-ready`. The primary bridge is
`game.state`; convenience methods also live directly on `game`:

```js
game.setTimeOfDay(17.4);
game.setMoney(4200);
game.setRespect(7);
game.setWantedLevel(4);
game.teleportPlayer(220, 130, 0);
game.setCamera({ preset: 'wide', heading: 0.3, pitch: 0.28, follow: false });
game.spawnPoliceChase({ count: 4, helicopter: true, level: 5 });
game.snapshot();
```

Money, respect and wanted are data hooks only. `spawnPoliceChase` queues a request,
emits `police-chase-request`, and reports `implemented: false`. Future police
code can consume the request with `game.state.consumeChaseRequest()` or subscribe
with `game.state.on(eventName, callback)`, which returns an unsubscribe function.
Teleporting preserves the current on-foot/driving mode and finds safe nearby
ground. Hours wrap within 0–24; `?hour=12&seed=3535377` selects a daytime seed.
The clock defaults to a held golden hour, not an accelerated day/night cycle.

`game.pause(true)` and `game.step(60)` permit deterministic simulation inspection.
`game.state.setTrafficEnabled(false)` freezes ambient traffic. Debug handles to
vehicles, collision, and the player remain available for development.

HUD panels are empty DOM containers. Police, wanted behavior, helicopters,
weapons/combat, missions, economy, garages, audio, ShotScenes, and submission
screenshots are intentionally reserved for phases two and three. `shots.json`
reserves four future shot names; its queries do not stage scenes yet.
`screenshots/` contains only a hidden directory marker.

## Verification and submission protocol

`node scripts/check.mjs` syntax-checks authored JavaScript.
With Playwright installed and the local server running,
`CHROMIUM_PATH=/path/to/chrome TMPDIR="$PWD/.verify" node scripts/verify.mjs`
checks rendering, offline requests, car entry/driving/braking/exit, walking,
collision and the state hooks. Diagnostics go under ignored `.verify/` and are
not competition screenshots. The checker uses the required sandbox/GPU/shm flags.

`MAKEFUN_OUTPUT_DIR=out node main.ts` exports the static game and screenshots,
then builds the canonical dossier using the untouched kit helper. This phase
intentionally cannot complete that export until genuine screenshots exist:
the kit rejects an empty screenshot directory. No placeholder renders are shipped.

## Attribution

All game code, procedural geometry, shader, textures, and scaffold are written
fresh. `vendor/makefun-game.ts` is the required byte-identical kit exception.
`game/vendor/three.min.js` is the ES-module minified build of **three.js r160**,
obtained from jsDelivr's `three@0.160.0/build/three.module.min.js`. Its upstream
MIT license is preserved in `game/vendor/THREE-LICENSE.txt`. The local filename
matches the brief; it is an ES module, not the legacy global THREE build.
The import map resolves `three` entirely locally. README badge images require
network only when viewing this repository page; the game never loads them.
