# Vermilion Bay: Low Tide — 3D core

[![make.fun GTA6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Live rank](https://make.fun/badge/gta6-01/hacker-beep/gta6-01-v2-entry/rank.svg)](https://make.fun/competitions/gta6-01)
[![Live reward](https://make.fun/badge/gta6-01/hacker-beep/gta6-01-v2-entry/reward.svg)](https://make.fun/competitions/gta6-01)

An original three.js open-world crime game for make.fun's “Make GTA 6” competition.
Mara Venn works the coast of Vermilion Bay: fourteen districts, police chases with
an air unit, pistol combat, fifteen story missions, an economy with garages and
upgrades, radio, a minimap, a map pause screen, and a title screen with career
save slots. Four staged screenshots in `screenshots/` show the chase, the map,
the combat, and the title.

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
- `police/WantedSystem.js`: heat, wanted levels and crime escalation.
- `police/PoliceDispatch.js`: radio chatter and dispatch messages.
- `police/PoliceAI.js`: patrol cars, roadblocks, helicopter and searchlight.
- `missions/MissionDirector.js`: fifteen story jobs with objectives and ratings.
- `combat/Weapons.js`: pistol combat, enemy guards, muzzle flashes and tracers.
- `economy/ShopsAndGarage.js`: upgrades, garages and vehicle purchases.
- `economy/Reputation.js`: respect tiers and district standing.
- `ui/Hud.js`: health, ammo, money, wanted stars and dispatch feed.
- `ui/Minimap.js`: live district minimap with the player arrow and job target.
- `ui/Menus.js`: pause menu and settings.
- `ui/Screens.js`: map pause screen and title screen with career save slots.
- `audio/AudioEngine.js`: procedural radio and sound effects.
- `audio/RadioSynth.js`: synthesized Bay FM station audio.
- `render/VehicleFire.js`: procedural flame and smoke for burning cars.
- `render/RoadSheen.js`: wet-asphalt light streak decals.
- `shots/ShotScenes.js`: the four staged capture scenes (chase, map, combat, title).
- `core/SaveGame.js`: career save slots.

Static furniture and buildings are instanced. Moving actors use shared geometry
and materials. Physics advances at 60 Hz with bounded catch-up. Traffic yields
to other cars and the on-foot player. Collision is deliberately approximate:
vehicles use circular footprints and pedestrians are ambient sidewalk actors.

## Shipped systems and debug bridge

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

Money, respect and wanted drive live systems: the wanted level spawns patrol cars
and the VBPD air unit (`police/PoliceAI.js`), dispatch radio narrates the chase
(`police/PoliceDispatch.js`), and the HUD shows heat, health, ammo and the
dispatch feed. `spawnPoliceChase` queues a chase request through the state bridge
(the legacy bridge still reports `implemented: false`; the live police system is
`PoliceAI`, driven by the wanted level). Teleporting preserves the current
on-foot/driving mode and finds safe nearby ground. Hours wrap within 0–24;
`?hour=12&seed=3535377` selects a daytime seed. The clock defaults to a held
golden hour, not an accelerated day/night cycle.

`game.pause(true)` and `game.step(60)` permit deterministic simulation inspection.
`game.state.setTrafficEnabled(false)` freezes ambient traffic. Debug handles to
vehicles, collision, and the player remain available for development.

Shipped systems: police chases with helicopter and searchlight, wanted levels,
pistol combat against Rook crew guards, fifteen story missions with ratings, an
economy with shops, garages and upgrades, respect tiers, procedural radio audio,
a live minimap, a map pause screen with career stats and save slots, and a title
screen. `shots.json` lists the four staged capture scenes; `shots/ShotScenes.js`
stages each one (chase, map, combat, title) and `screenshots/` holds the four
rendered frames.

## Verification and submission protocol

`node scripts/check.mjs` syntax-checks authored JavaScript.
With Playwright installed and the local server running,
`CHROMIUM_PATH=/path/to/chrome TMPDIR="$PWD/.verify" node scripts/verify.mjs`
checks rendering, offline requests, car entry/driving/braking/exit, walking,
collision and the state hooks. Diagnostics go under ignored `.verify/` and are
not competition screenshots. The checker uses the required sandbox/GPU/shm flags.

`node scripts/take-screenshots.mjs` renders the four staged screenshots into
`screenshots/` (1280×720 JPEG, one per `shots.json` entry) using a local
Playwright Chromium against `serve.ts` on :8088. `MAKEFUN_OUTPUT_DIR=out node
main.ts` exports the static game and screenshots, then builds the canonical
dossier using the untouched kit helper. The export requires the four genuine
screenshots; no placeholder renders are shipped.

## Attribution

All game code, procedural geometry, shader, textures, and scaffold are written
fresh. `vendor/makefun-game.ts` is the required byte-identical kit exception.
`game/vendor/three.min.js` is the ES-module minified build of **three.js r160**,
obtained from jsDelivr's `three@0.160.0/build/three.module.min.js`. Its upstream
MIT license is preserved in `game/vendor/THREE-LICENSE.txt`. The local filename
matches the brief; it is an ES module, not the legacy global THREE build.
The import map resolves `three` entirely locally. README badge images require
network only when viewing this repository page; the game never loads them.
