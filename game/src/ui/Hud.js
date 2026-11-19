const style = `position:fixed;color:#f4ecd7;background:rgba(14,30,34,.88);border-left:3px solid #e6b86e;padding:9px 12px;font:14px/1.4 system-ui,sans-serif;letter-spacing:0;max-width:310px;text-shadow:0 1px 2px #000`;

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
    Object.assign(this.nodes.mission.style, { left: '18px', top: '18px', width: '310px' });
    Object.assign(this.nodes.status.style, { right: '18px', top: '18px', minWidth: '200px' });
    Object.assign(this.nodes.dispatch.style, { left: '18px', top: '126px', width: '260px' });
    Object.assign(this.nodes.garage.style, { left: '18px', top: '126px', width: '280px' });
    Object.assign(this.nodes.minimap.style, { right: '18px', bottom: '18px', width: '194px', height: '194px', padding: '0', border: '3px solid #e6b86e', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 4px #183238, 0 5px 22px #0008' });
    Object.assign(this.nodes.vehicle.style, { right: '18px', top: '220px', minWidth: '140px' });
    Object.assign(this.nodes.dialogue.style, { left: '50%', bottom: '24px', transform: 'translateX(-50%)', width: 'min(450px, 64vw)', maxWidth: '450px', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '14px' });
    Object.assign(this.nodes.radio.style, { right: '18px', bottom: '228px' });
    Object.assign(this.nodes.weapons.style, { right: '18px', top: '148px', maxWidth: 'none', display: 'flex', gap: '5px', padding: '0', border: 'none', background: 'none' });
    this.nodes.minimap.innerHTML = '<canvas width="240" height="240" aria-label="Circular district minimap with police search zone"></canvas>';
    this.map = this.nodes.minimap.querySelector('canvas').getContext('2d');
  }
  drawMap(snapshot, city, police) {
    const c = this.map, size = 240, mid = 120, scale = 1.8;
    c.clearRect(0,0,size,size); c.save(); c.beginPath(); c.arc(mid,mid,118,0,Math.PI*2); c.clip();
    c.fillStyle='#608076'; c.fillRect(0,0,size,size);
    const xy = (x,z) => [mid+(x-snapshot.player.x)*scale, mid+(z-snapshot.player.z)*scale];
    c.strokeStyle='#213b40'; c.lineWidth=13;
    for (const x of city.roadsX) {const [px]=xy(x,0);c.beginPath();c.moveTo(px,0);c.lineTo(px,size);c.stroke();}
    for (const z of city.roadsZ) {const [,py]=xy(0,z);c.beginPath();c.moveTo(0,py);c.lineTo(size,py);c.stroke();}
    c.strokeStyle='#c0b78f'; c.lineWidth=2;
    for (const x of city.roadsX) {const [px]=xy(x,0);c.beginPath();c.moveTo(px,0);c.lineTo(px,size);c.stroke();}
    for (const z of city.roadsZ) {const [,py]=xy(0,z);c.beginPath();c.moveTo(0,py);c.lineTo(size,py);c.stroke();}
    if(snapshot.wanted.level) {
      c.beginPath(); c.arc(mid+12,mid-8,71,0,Math.PI*2);
      c.fillStyle='rgba(243,93,66,.25)'; c.fill();
      c.setLineDash([8,5]);c.strokeStyle='#ffab77';c.lineWidth=4;c.stroke();c.setLineDash([]);
    }
    const point=(x,z,color,r)=>{let [px,py]=xy(x,z);const d=Math.hypot(px-mid,py-mid);if(d>99){px=mid+(px-mid)*99/d;py=mid+(py-mid)*99/d;}c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle='#132c32';c.lineWidth=2;c.stroke();};
    for(const car of police.units)point(car.position.x,car.position.z,'#ff7868',5);
    if(snapshot.mission.active)point(snapshot.mission.active.target.x,snapshot.mission.active.target.z,'#70ffce',7);
    c.save();c.translate(mid,mid);c.rotate(-(snapshot.player.heading || 0));
    c.beginPath();c.moveTo(0,-12);c.lineTo(8,9);c.lineTo(0,5);c.lineTo(-8,9);c.closePath();c.fillStyle='#fff4b0';c.fill();c.strokeStyle='#183238';c.lineWidth=2;c.stroke();c.restore();
    c.textAlign='center';c.font='bold 17px system-ui';
    c.fillStyle='#102d34';c.fillRect(103,3,34,24);c.fillStyle='#fff1cc';c.fillText('N',120,22);
    c.fillStyle='#102d34';c.fillRect(17,196,206,28);c.fillStyle='#fff1cc';
    c.font='bold 14px system-ui';c.fillText(snapshot.wanted.level?'SEARCH ZONE':snapshot.district.name,120,215);
    c.restore();
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
    this.nodes.dispatch.innerHTML=rows.length?`<div style="display:flex;justify-content:space-between;border-bottom:1px solid #69706a;padding-bottom:7px;margin-bottom:5px;letter-spacing:1px"><b>VBPD / DISPATCH</b><span>${rows.length} UNITS</span></div>${rows.map(row=>`<div style="display:grid;grid-template-columns:1fr 36px 106px;gap:6px;align-items:center;margin:5px 0"><b>${row.name}</b><span style="text-align:right">${row.distance} m</span><b style="background:${row.color};padding:2px 4px;text-align:center;font-size:12px;letter-spacing:.3px">${row.status}</b></div>`).join('')}${message?`<div style="font-size:10px;color:#c9c9b6;border-top:1px solid #69706a;padding-top:6px;margin-top:7px">${message.text}</div>`:''}`:'';
    const owned=snapshot.shop.catalog.filter(item=>item.owned);
    this.nodes.garage.innerHTML=owned.length?`<b>KITE &amp; KEY / MOTOR WORKS</b><br>${owned.map(item=>`✓ ${item.name} / ${item.effect}`).join('<br>')}<br>UPGRADES ${owned.length}/${snapshot.shop.catalog.length}`:'';
    this.nodes.vehicle.innerHTML=snapshot.player.mode==='driving'?`<b style="color:#f1c573;letter-spacing:1px">${snapshot.vehicleName.toUpperCase()}</b><div><b style="font-size:60px;line-height:1.05;font-variant-numeric:tabular-nums">${Math.round(Math.abs(snapshot.player.speed)*3.6)}</b> <b>km/h</b></div>`:snapshot.district.name;
    const dialogue = mission.dialogue || 'MARA VENN / VERMILION BAY';
    const speaker = dialogue.startsWith('INEZ /') ? 'INEZ' : 'MARA VENN';
    const line = dialogue.includes(' / ') ? dialogue.split(' / ').slice(1).join(' / ') : dialogue;
    this.nodes.dialogue.innerHTML=`${portrait(speaker)}<div><b style="color:#f1c573;letter-spacing:2px;font-size:13px">${speaker}</b><div style="font-weight:650;margin-top:5px">${line}</div></div>`;
    this.nodes.radio.textContent='BAY FM / 88.6  •  Warm air, low tide';
    this.nodes.weapons.innerHTML=[['FISTS','∞','punch'],['PISTOL',`${snapshot.combat.ammo} RDS`,'pistol'],['SMG','LOCKED','locked'],['SHOTGUN','LOCKED','locked']].map(([name,ammo,key],index)=>`<div style="min-width:73px;padding:7px 8px;border:1px solid ${snapshot.combat.weapon===key?'#f1c573':'#65716a'};background:${snapshot.combat.weapon===key?'#795633':'rgba(14,30,34,.9)'};box-shadow:${snapshot.combat.weapon===key?'inset 0 3px #f1c573':'none'};opacity:${key==='locked'?.65:1}"><span style="font-size:11px;color:#cfbd95">0${index+1}</span> <b style="font-size:14px">${name}</b><div style="font-size:12px;color:#f1c573">${ammo}</div></div>`).join('');
    this.drawMap(snapshot,city,police);
  }
}
