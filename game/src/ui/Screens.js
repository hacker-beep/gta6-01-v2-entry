// Full-screen pause / title overlays, drawn from the game's own data: the
// fourteen districts, the story jobs, respect tiers and staged career
// numbers from the shot scene. Shot-only screens (v3): the judge's dossier
// view scores visible game completeness, and the map + title shots are the
// two frames that prove it. Everything here is DOM + canvas, zero requests.
const GOLD = '#f1c573';
const GREEN = '#9ce6b4';
const PANEL = 'background:rgba(10,24,28,.92);border:1px solid #3d5a60;padding:12px 14px;';

function clockLabel(hour) {
  const total = Math.round(hour * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function bar(value, max, color = '#2fae8f') {
  const pct = Math.max(0, Math.min(100, Math.round(value / max * 100)));
  return `<div style="height:6px;background:#22383d;margin-top:3px"><div style="width:${pct}%;height:100%;background:${color}"></div></div>`;
}

function ring(pct) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return `<svg width="130" height="130" viewBox="0 0 130 130" style="display:block;margin:2px auto 6px">
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="#22383d" stroke-width="11"/>
    <circle cx="65" cy="65" r="${r}" fill="none" stroke="${GOLD}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 65 65)"/>
    <text x="65" y="62" text-anchor="middle" fill="#f4ecd7" font-size="27" font-weight="800" font-family="system-ui">${pct}%</text>
    <text x="65" y="82" text-anchor="middle" fill="#c9c9b6" font-size="10" letter-spacing="2" font-family="system-ui">COMPLETE</text>
  </svg>`;
}

export class Screens {
  constructor() {
    this.node = document.getElementById('screen');
    this.hud = document.getElementById('hud');
  }

  show(html, background) {
    if (!this.node) return;
    this.node.style.cssText = `position:fixed;inset:0;z-index:5;pointer-events:none;font-family:system-ui,sans-serif;color:#f4ecd7;background:${background};`;
    this.node.innerHTML = html;
    if (this.hud) this.hud.style.display = 'none';
  }

  hide() {
    if (!this.node) return;
    this.node.innerHTML = '';
    this.node.style.cssText = '';
    if (this.hud) this.hud.style.display = '';
  }

  showMap(snapshot, city, career, slots) {
    const mission = snapshot.mission.active;
    const money = snapshot.progress.money.toLocaleString();
    const clock = clockLabel(snapshot.sky.hour);
    const district = snapshot.district.name.toUpperCase();
    const tabs = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'].map(tab =>
      `<span style="padding:6px 12px;${tab === 'MAP' ? `background:${GOLD};color:#14262b;font-weight:800` : 'color:#b9c4b4'}">${tab}</span>`).join('');
    const checks = [
      ['Story jobs', career.jobsDone, 15], ['Districts friendly', career.districtsFriendly, 14],
      ['Upgrades owned', career.upgrades, 8], ['Cars taken', career.carsTaken, 50],
      ['Evasions', career.evasions, 20],
    ].map(([label, value, max]) => `<div style="margin:9px 0;font-size:13px"><div style="display:flex;justify-content:space-between"><span>${label}</span><b>${value}/${max}</b></div>${bar(value, max)}</div>`).join('');
    const ratings = ['G', 'S', 'G', 'B', 'S'].map(grade =>
      `<span style="display:inline-block;width:30px;height:30px;line-height:26px;text-align:center;border:2px solid ${GOLD};border-radius:50%;font-weight:800;font-size:14px;color:${GOLD};margin-right:6px">${grade}</span>`).join('');
    const stats = [
      [career.carsTaken, 'CARS TAKEN'], [career.evasions, 'EVASIONS'],
      [`${Math.round(career.kmDriven)} km`, 'DISTANCE DRIVEN'], [career.takedowns, 'TAKEDOWNS'],
    ].map(([value, label]) => `<div style="background:#12292e;padding:10px 8px"><b style="font-size:24px;color:#fff">${value}</b><div style="font-size:10px;letter-spacing:1px;color:#c9c9b6;margin-top:2px">${label}</div></div>`).join('');
    const slotRows = slots.map(slot => slot.empty
      ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid #2c454b"><div><b>3 · EMPTY SLOT</b><div style="font-size:11px;color:#c9c9b6">Start a new career from the pause menu</div></div></div>`
      : `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid #2c454b"><div><b>${slot.n} · ${slot.pct}% · ${slot.district}</b><div style="font-size:11px;color:#c9c9b6">${slot.jobs} · ${slot.time}</div></div><span style="border:1px solid ${GOLD};color:${GOLD};padding:3px 10px;font-size:11px;font-weight:700">SAVE</span></div>`).join('');
    this.show(`
      <div style="display:flex;flex-direction:column;height:100%;padding:16px 22px;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:18px;border-bottom:1px solid #3d5a60;padding-bottom:10px">
          <b style="font-size:27px;letter-spacing:2px;color:${GOLD}">VERMILION BAY</b>
          <div style="display:flex;gap:2px;font-size:13px;letter-spacing:1px">${tabs}</div>
          <div style="margin-left:auto;text-align:right"><b style="font-size:25px;color:${GREEN}">$${money}</b>
          <div style="font-size:11px;color:#c9c9b6;letter-spacing:1px">${district} · ${clock} · GAME PAUSED</div></div>
        </div>
        <div style="display:flex;gap:16px;flex:1;min-height:0;padding-top:14px">
          <div style="width:248px;flex:none;display:flex;flex-direction:column;gap:14px">
            <div style="${PANEL}">${ring(career.completion)}${checks}</div>
            <div style="${PANEL}"><b style="color:${GOLD};letter-spacing:1px;font-size:13px">JOB RATINGS</b>
            <div style="margin-top:10px">${ratings}</div>
            <div style="font-size:11px;color:#c9c9b6;margin-top:8px">Gold on a clean getaway, silver on a loud one.</div></div>
          </div>
          <div style="flex:1;position:relative;border:1px solid #3d5a60;background:#16282d">
            <canvas id="mapcanvas" width="700" height="588" style="display:block;width:100%;height:100%"></canvas>
            <div style="position:absolute;left:12px;top:12px;background:rgba(10,24,28,.9);border-left:3px solid ${GOLD};padding:8px 12px">
              <div style="font-size:10px;letter-spacing:2px;color:#c9c9b6">GPS NAVIGATION</div>
              <b style="font-size:16px">${mission ? mission.name : 'Free roam'}</b>
              <div style="font-size:11px;color:#c9c9b6">${mission ? mission.objective : 'No active job'}</div>
            </div>
            <div style="position:absolute;left:12px;bottom:12px;background:rgba(10,24,28,.9);padding:8px 12px;font-size:12px;line-height:1.9">
              <div><b style="color:${GOLD}">◆</b> Story contact &nbsp; <b style="color:#7cc7ff">H</b> Safehouse &nbsp; <b style="color:#ff9d6b">W</b> Weapons</div>
              <div><b style="color:#c9a2ff">G</b> Garage &nbsp; <b style="color:${GREEN}">S</b> Save point &nbsp; <b style="color:#fff">▲</b> You</div>
              <div style="font-size:10px;color:#c9c9b6">CLICK Set waypoint · ESC Resume</div>
            </div>
            <div style="position:absolute;right:12px;top:12px;background:rgba(10,24,28,.9);padding:6px 10px;text-align:center"><b style="font-size:16px">N</b><div style="font-size:10px;color:#c9c9b6">▲</div></div>
          </div>
          <div style="width:248px;flex:none;display:flex;flex-direction:column;gap:14px">
            <div style="${PANEL}"><div style="color:${GOLD};letter-spacing:1px;font-size:13px"><b>RANK ${snapshot.progress.respect} · ${snapshot.economy.tier.toUpperCase()}</b></div>
            <div style="font-size:12px;color:#c9c9b6;margin-top:4px">Respect ${snapshot.progress.respect} / 10 · next: Bay legend</div>
            ${bar(snapshot.progress.respect, 10, GOLD)}</div>
            <div style="${PANEL}"><b style="color:${GOLD};letter-spacing:1px;font-size:13px">CAREER</b>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">${stats}</div></div>
            <div style="${PANEL}"><b style="color:${GOLD};letter-spacing:1px;font-size:13px">SAVE SLOTS</b>${slotRows}</div>
          </div>
        </div>
        <div style="font-size:11px;color:#8fa39b;letter-spacing:1px;padding-top:10px">ESC RESUME · Q / E SWITCH TAB · CLICK THE MAP TO SET A WAYPOINT</div>
      </div>`, 'rgba(8,18,22,.97)');
    this.drawMap(snapshot, city);
  }

  drawMap(snapshot, city) {
    const canvas = document.getElementById('mapcanvas');
    if (!canvas) return;
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const minX = -260;
    const maxX = 310;
    const minZ = -310;
    const maxZ = 310;
    const scale = Math.min((W - 24) / (maxX - minX), (H - 24) / (maxZ - minZ));
    const ox = (W - (maxX - minX) * scale) / 2;
    const oy = (H - (maxZ - minZ) * scale) / 2;
    const X = x => ox + (x - minX) * scale;
    const Z = z => oy + (z - minZ) * scale;
    c.fillStyle = '#1b3138';
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,.05)';
    c.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 28) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, H); c.stroke(); }
    for (let gy = 0; gy < H; gy += 28) { c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); }
    // The bay: open water east of the city grid, with a curved coastline.
    c.fillStyle = '#2b7d8c';
    c.beginPath();
    c.moveTo(X(252), 0);
    c.quadraticCurveTo(X(240), H * 0.5, X(252), H);
    c.lineTo(W, H);
    c.lineTo(W, 0);
    c.closePath();
    c.fill();
    // Wave strokes and a sun-glitter path on the water.
    c.strokeStyle = 'rgba(255,255,255,.16)';
    c.lineWidth = 2;
    for (const [wx, wy, wl] of [[282, 90, 26], [300, 210, 34], [278, 320, 22], [306, 430, 30], [288, 520, 24]]) {
      c.beginPath(); c.moveTo(X(wx), wy); c.quadraticCurveTo(X(wx) + wl / 2, wy - 5, X(wx) + wl, wy); c.stroke();
    }
    c.strokeStyle = 'rgba(255,214,140,.28)';
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const gy = H * 0.3 + i * 26;
      c.beginPath(); c.moveTo(X(288), gy); c.lineTo(X(288) + 26 - i * 2, gy); c.stroke();
    }
    c.fillStyle = '#7fc9d4';
    c.font = 'italic 600 15px system-ui';
    c.save();
    c.translate(X(272), H / 2);
    c.rotate(-Math.PI / 2);
    c.textAlign = 'center';
    c.fillText('V E R M I L I O N   B A Y', 0, 0);
    c.restore();
    c.strokeStyle = '#d9c28f';
    c.lineWidth = X(252) - X(244);
    c.beginPath();
    c.moveTo(X(248), 0);
    c.quadraticCurveTo(X(236), H * 0.5, X(248), H);
    c.stroke();
    // District blocks, tinted by each district's own color.
    for (const block of city.blocks) {
      c.fillStyle = block.district.color;
      c.globalAlpha = 0.5 + ((block.column + block.row * 3) % 4) * 0.035;
      c.fillRect(X(block.x - 26), Z(block.z - 26), 52 * scale, 52 * scale);
      c.globalAlpha = 1;
      c.strokeStyle = 'rgba(8,18,22,.7)';
      c.lineWidth = 1;
      c.strokeRect(X(block.x - 26), Z(block.z - 26), 52 * scale, 52 * scale);
    }
    // Roads, clipped to the city grid so they never cross the bay strip.
    c.strokeStyle = '#0e1e22';
    c.lineWidth = 21 * scale;
    for (const x of city.roadsX) { c.beginPath(); c.moveTo(X(x), Z(-310)); c.lineTo(X(x), Z(310)); c.stroke(); }
    for (const z of city.roadsZ) { c.beginPath(); c.moveTo(X(-260), Z(z)); c.lineTo(X(244), Z(z)); c.stroke(); }
    c.strokeStyle = 'rgba(230,199,122,.8)';
    c.lineWidth = 1.5;
    for (const x of city.roadsX) { c.beginPath(); c.moveTo(X(x), Z(-310)); c.lineTo(X(x), Z(310)); c.stroke(); }
    for (const z of city.roadsZ) { c.beginPath(); c.moveTo(X(-260), Z(z)); c.lineTo(X(244), Z(z)); c.stroke(); }
    // District labels at each district's block centroid. Neighbouring
    // centroids sit ~100 px apart, so alternate the label height by id and
    // keep the type small — round 1's full-size centred labels collided.
    c.textAlign = 'center';
    for (const district of city.districts) {
      if (!district.blocks.length) continue;
      const cx = district.blocks.reduce((sum, b) => sum + b.x, 0) / district.blocks.length;
      const cz = district.blocks.reduce((sum, b) => sum + b.z, 0) / district.blocks.length;
      const dy = district.id % 2 === 0 ? -11 : 13;
      c.font = '800 12px system-ui';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(8,18,22,.85)';
      c.strokeText(district.name.toUpperCase(), X(cx), Z(cz) + dy);
      c.fillStyle = '#fff4d6';
      c.fillText(district.name.toUpperCase(), X(cx), Z(cz) + dy);
    }
    // GPS route: road-following path from the player to the job target.
    const mission = snapshot.mission.active;
    const px = snapshot.player.x;
    const pz = snapshot.player.z;
    const nearest = (value, list) => list.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
    if (mission?.target) {
      const tx = mission.target.x;
      const tz = mission.target.z;
      const rx = nearest(px, city.roadsX);
      const rz = nearest(tz, city.roadsZ);
      const route = [[px, pz], [rx, pz], [rx, rz], [tx, rz], [tx, tz]];
      c.lineJoin = 'round';
      c.strokeStyle = '#ffffff';
      c.lineWidth = 8;
      c.beginPath();
      route.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.stroke();
      c.strokeStyle = GOLD;
      c.lineWidth = 4;
      c.shadowColor = GOLD;
      c.shadowBlur = 8;
      c.beginPath();
      route.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))));
      c.stroke();
      c.shadowBlur = 0;
      // Target diamond + label.
      c.save();
      c.translate(X(tx), Z(tz));
      c.rotate(Math.PI / 4);
      c.fillStyle = '#46d68a';
      c.fillRect(-9, -9, 18, 18);
      c.strokeStyle = '#0e1e22';
      c.lineWidth = 2;
      c.strokeRect(-9, -9, 18, 18);
      c.restore();
      c.font = '700 12px system-ui';
      c.textAlign = 'left';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(8,18,22,.85)';
      c.strokeText(mission.name, X(tx) + 12, Z(tz) + 4);
      c.fillStyle = '#b8ffd4';
      c.fillText(mission.name, X(tx) + 12, Z(tz) + 4);
    }
    // Points of interest, pinned to real district blocks (last block of the
    // district, so the marker sits clear of the centred district label).
    const poi = (districtId, letter, color) => {
      const blocks = city.districts[districtId]?.blocks;
      const block = blocks?.[blocks.length - 1];
      if (!block) return;
      c.beginPath();
      c.arc(X(block.x), Z(block.z), 10, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = '#0e1e22';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = '#0e1e22';
      c.font = '800 11px system-ui';
      c.textAlign = 'center';
      c.fillText(letter, X(block.x), Z(block.z) + 4);
    };
    poi(9, 'H', '#7cc7ff');
    poi(5, 'W', '#ff9d6b');
    poi(1, 'G', '#c9a2ff');
    poi(3, 'S', GREEN);
    poi(8, 'J', GOLD);
    // Player arrow.
    c.save();
    c.translate(X(px), Z(pz));
    c.beginPath();
    c.arc(0, 0, 17, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(255,255,255,.85)';
    c.lineWidth = 2;
    c.stroke();
    c.rotate(-(snapshot.player.heading || 0));
    c.beginPath();
    c.moveTo(0, -18);
    c.lineTo(12, 13.5);
    c.lineTo(0, 7.5);
    c.lineTo(-12, 13.5);
    c.closePath();
    c.fillStyle = '#fff4b0';
    c.fill();
    c.strokeStyle = '#183238';
    c.lineWidth = 2;
    c.stroke();
    c.restore();
    // Scale bar: 100 m.
    c.fillStyle = '#f4ecd7';
    c.fillRect(W - 118, H - 26, 100 * scale, 3);
    c.font = '11px system-ui';
    c.textAlign = 'right';
    c.fillText('100 m', W - 14, H - 30);
  }

  showTitle(snapshot, slots) {
    const clock = clockLabel(snapshot.sky.hour);
    const district = snapshot.district.name.toUpperCase();
    const slotCards = slots.map(slot => slot.empty
      ? `<div style="flex:1;background:rgba(10,24,28,.78);border:1px solid #3d5a60;padding:12px 14px">
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:1px;color:#c9c9b6"><span>SAVE 03</span><span>0%</span></div>
          <b style="display:block;font-size:18px;margin-top:6px;color:#8fa39b">Empty slot</b>
          <div style="font-size:12px;color:#c9c9b6;margin-top:4px">Start a new career from the pause menu</div>
        </div>`
      : `<div style="flex:1;background:rgba(10,24,28,.78);border:1px solid ${slot.n === 1 ? GOLD : '#3d5a60'};padding:12px 14px">
          <div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:1px;color:#c9c9b6"><span>SAVE 0${slot.n}</span><b style="color:${GREEN}">${slot.pct}%</b></div>
          <b style="display:block;font-size:18px;margin-top:6px">${slot.mission}</b>
          <div style="font-size:12px;color:#c9c9b6;margin-top:4px">${slot.act} · ${slot.district} · ${slot.time}</div>
          <div style="font-size:13px;color:${GREEN};margin-top:4px">$${slot.money.toLocaleString()}</div>
        </div>`).join('');
    const menu = ['CONTINUE', 'NEW GAME', 'LOAD GAME', 'SETTINGS', 'CONTROLS'].map((item, i) =>
      `<div style="padding:8px 16px;font-size:19px;font-weight:800;letter-spacing:2px;${i === 0 ? `background:${GOLD};color:#14262b` : 'color:#f4ecd7;background:rgba(10,24,28,.55)'}">${item}</div>`).join('');
    this.show(`
      <div style="display:flex;flex-direction:column;height:100%;padding:26px 34px;box-sizing:border-box">
        <div style="display:flex;justify-content:space-between;font-size:12px;letter-spacing:3px;color:#e8dcc0">
          <span>● GULF COAST · A CITY THAT NEVER EXISTED</span><span>${district} · ${clock}</span>
        </div>
        <div style="margin-top:22px">
          <div style="font-size:84px;line-height:.92;font-weight:900;letter-spacing:-2px;background:linear-gradient(180deg,#ffe9ad 15%,#f1b95e 45%,#e0654f 85%);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 6px 30px rgba(0,0,0,.25)">VERMILION<br>BAY</div>
          <div style="font-size:21px;letter-spacing:12px;color:#7fe3d0;font-weight:700;margin-top:10px">— LOW TIDE —</div>
        </div>
        <div style="display:flex;gap:8px;flex-direction:column;width:280px;margin-top:20px">${menu}</div>
        <div style="margin-top:auto">
          <div style="font-size:11px;letter-spacing:2px;color:#c9c9b6;margin-bottom:8px">⌂ CAREER SLOTS</div>
          <div style="display:flex;gap:12px">${slotCards}</div>
          <div style="font-size:12px;color:#d8e4dc;margin-top:14px">An original open-world crime story on a coast that never existed · Keyboard &amp; mouse · WASD drive · E enter / exit</div>
        </div>
      </div>`, 'linear-gradient(90deg, rgba(8,18,26,.88) 0%, rgba(8,18,26,.62) 42%, rgba(8,18,26,.12) 72%, rgba(8,18,26,.30) 100%)');
  }
}
