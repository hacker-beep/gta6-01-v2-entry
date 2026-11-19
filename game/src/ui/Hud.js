const style = `position:fixed;color:#f4ecd7;background:rgba(14,30,34,.88);border-left:3px solid #e6b86e;padding:9px 12px;font:12px/1.45 system-ui,sans-serif;letter-spacing:0;max-width:310px;text-shadow:0 1px 2px #000`;

// Original pixel busts stay sharp at contact-sheet scale without image requests.
function portrait(speaker) {
  const inez = speaker === 'INEZ';
  return `<svg width="70" height="76" viewBox="0 0 32 36" role="img" aria-label="${speaker} portrait" shape-rendering="crispEdges" style="flex:none;border:2px solid #e6b86e;background:#315d63">
    <path fill="#487c80" d="M0 4h32v4H0zm0 12h32v2H0zm0 12h32v2H0z"/>
    <path fill="${inez ? '#252c30' : '#3b2926'}" d="M8 5h16v20H8z"/>
    <path fill="${inez ? '#b97e55' : '#d6a077'}" d="M10 10h12v12h-3v4h-6v-4h-3z"/>
    <path fill="${inez ? '#20282b' : '#492c24'}" d="M8 5h16v7H12v3H8z"/>
    <path fill="#20282b" d="M12 16h2v2h-2zm6 0h2v2h-2z"/><path fill="#7c4339" d="M14 21h4v1h-4z"/>
    <path fill="${inez ? '#e7bc68' : '#b94737'}" d="M5 29l8-5 3 4 3-4 8 5v7H5z"/>
    <path fill="#f3d29a" d="M8 30h2v2H8zm14 0h2v2h-2z"/></svg>`;
}

export class Hud {
  constructor() {
    this.nodes = Object.fromEntries(['mission','status','dispatch','garage','minimap','vehicle','dialogue','radio','weapons'].map(id => [id, document.getElementById(id)]));
    for (const node of Object.values(this.nodes)) { node.style.cssText = style; }
    Object.assign(this.nodes.mission.style, { left: '18px', top: '18px', width: '295px' });
    Object.assign(this.nodes.status.style, { right: '18px', top: '18px', minWidth: '200px' });
    Object.assign(this.nodes.dispatch.style, { left: '18px', top: '126px', width: '260px' });
    Object.assign(this.nodes.garage.style, { left: '18px', top: '126px', width: '280px' });
    Object.assign(this.nodes.minimap.style, { right: '18px', bottom: '18px', width: '220px', height: '154px', padding: '0', border: '1px solid #dbc68e' });
    Object.assign(this.nodes.vehicle.style, { right: '18px', top: '220px', minWidth: '140px' });
    Object.assign(this.nodes.dialogue.style, { left: '50%', bottom: '24px', transform: 'translateX(-50%)', width: 'min(450px, 64vw)', maxWidth: '450px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '14px' });
    Object.assign(this.nodes.radio.style, { right: '18px', bottom: '186px' });
    Object.assign(this.nodes.weapons.style, { right: '18px', top: '148px', maxWidth: 'none', display: 'flex', gap: '5px', padding: '0', border: 'none', background: 'none' });
    this.nodes.minimap.innerHTML = '<canvas width="220" height="154" aria-label="District minimap"></canvas>';
    this.map = this.nodes.minimap.querySelector('canvas').getContext('2d');
  }
  drawMap(snapshot, city, police) {
    const c = this.map; c.clearRect(0,0,220,154); c.fillStyle='#183238'; c.fillRect(0,0,220,154);
    c.strokeStyle='#9c9880'; c.lineWidth=3;
    for (let x=0;x<7;x++){const px=12+x*32;c.beginPath();c.moveTo(px,8);c.lineTo(px,142);c.stroke();}
    for (let y=0;y<9;y++){const py=8+y*17;c.beginPath();c.moveTo(8,py);c.lineTo(212,py);c.stroke();}
    const point=(x,z,color,r)=>{c.fillStyle=color;c.beginPath();c.arc(110+(x/500)*190,77+(z/660)*130,r,0,Math.PI*2);c.fill();};
    for(const car of police.units)point(car.position.x,car.position.z,'#ec6c59',3);
    point(snapshot.player.x,snapshot.player.z,'#fff0a1',4);
    if(snapshot.mission.active)point(snapshot.mission.active.target.x,snapshot.mission.active.target.z,'#70dfba',4);
    c.fillStyle='#d3dfce';c.font='10px system-ui';c.fillText(snapshot.district.name,8,149);
  }
  update(snapshot, city, dispatch, police) {
    const mission=snapshot.mission; this.nodes.mission.innerHTML=mission.active?`<b>ACT ${mission.active.act} / ${mission.active.name}</b><br>${mission.active.objective}`:'<b>STORY / Select a job</b>';
    const stars='★'.repeat(snapshot.wanted.level)+'☆'.repeat(5-snapshot.wanted.level);
    this.nodes.status.innerHTML=`<div style="color:#f1c573;font-size:21px;letter-spacing:3px">${stars}</div><b style="display:block;font-size:38px;line-height:1.15;color:#9ce6b4;font-variant-numeric:tabular-nums">$${snapshot.progress.money.toLocaleString()}</b><div style="margin-top:5px">RESPECT ${snapshot.progress.respect} &nbsp; HEALTH ${snapshot.combat.health}/100</div>`;
    const distance = position => Math.round(Math.hypot(position.x-snapshot.player.x, position.z-snapshot.player.z));
    const names = ['Harbor 12','Cedar 4','North 21','Bay 6','Quay 9'];
    const rows = police.units.map((car,index) => ({ name:names[index], distance:distance(car.position), status:distance(car.position)<16?'INTERCEPT':'CLOSING', color:'#d76551' }));
    if (police.heli) rows.push({ name:'Air 1', distance:distance(police.heli.root.position), status:'SEARCHLIGHT', color:'#438cb0' });
    rows.sort((a,b)=>a.distance-b.distance);
    const message = dispatch.snapshot()[0];
    this.nodes.dispatch.innerHTML=rows.length?`<div style="display:flex;justify-content:space-between;border-bottom:1px solid #69706a;padding-bottom:7px;margin-bottom:5px;letter-spacing:1px"><b>VBPD / DISPATCH</b><span>${rows.length} UNITS</span></div>${rows.map(row=>`<div style="display:grid;grid-template-columns:1fr 44px 96px;gap:6px;align-items:center;margin:5px 0"><b>${row.name}</b><span style="text-align:right">${row.distance} m</span><b style="background:${row.color};padding:2px 4px;text-align:center;font-size:10px;letter-spacing:.5px">${row.status}</b></div>`).join('')}${message?`<div style="font-size:10px;color:#c9c9b6;border-top:1px solid #69706a;padding-top:6px;margin-top:7px">${message.text}</div>`:''}`:'';
    const owned=snapshot.shop.catalog.filter(item=>item.owned);
    this.nodes.garage.innerHTML=owned.length?`<b>KITE &amp; KEY / MOTOR WORKS</b><br>${owned.map(item=>`✓ ${item.name} / ${item.effect}`).join('<br>')}<br>UPGRADES ${owned.length}/${snapshot.shop.catalog.length}`:'';
    this.nodes.vehicle.innerHTML=snapshot.player.mode==='driving'?`<b style="color:#f1c573;letter-spacing:1px">${snapshot.vehicleName.toUpperCase()}</b><div><b style="font-size:60px;line-height:1.05;font-variant-numeric:tabular-nums">${Math.round(Math.abs(snapshot.player.speed)*3.6)}</b> <b>km/h</b></div>`:snapshot.district.name;
    const dialogue = mission.dialogue || 'MARA VENN / VERMILION BAY';
    const speaker = dialogue.startsWith('INEZ /') ? 'INEZ' : 'MARA VENN';
    const line = dialogue.includes(' / ') ? dialogue.split(' / ').slice(1).join(' / ') : dialogue;
    this.nodes.dialogue.innerHTML=`${portrait(speaker)}<div><b style="color:#f1c573;letter-spacing:2px;font-size:13px">${speaker}</b><div style="font-weight:650;margin-top:5px">${line}</div></div>`;
    this.nodes.radio.textContent='BAY FM / 88.6  •  Warm air, low tide';
    this.nodes.weapons.innerHTML=[['FISTS','∞','punch'],['PISTOL',`${snapshot.combat.ammo} RDS`,'pistol'],['SMG','LOCKED','locked'],['SHOTGUN','LOCKED','locked']].map(([name,ammo,key],index)=>`<div style="min-width:62px;padding:6px 7px;border:1px solid ${snapshot.combat.weapon===key?'#f1c573':'#65716a'};background:${snapshot.combat.weapon===key?'#795633':'rgba(14,30,34,.9)'};box-shadow:${snapshot.combat.weapon===key?'inset 0 3px #f1c573':'none'};opacity:${key==='locked'?.65:1}"><span style="font-size:9px;color:#cfbd95">0${index+1}</span> <b style="font-size:11px">${name}</b><div style="font-size:10px;color:#f1c573">${ammo}</div></div>`).join('');
    this.drawMap(snapshot,city,police);
  }
}
