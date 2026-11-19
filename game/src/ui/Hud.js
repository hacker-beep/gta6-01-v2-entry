const style = `position:fixed;color:#f4ecd7;background:rgba(14,30,34,.88);border-left:3px solid #e6b86e;padding:9px 12px;font:12px/1.45 system-ui,sans-serif;letter-spacing:0;max-width:310px;text-shadow:0 1px 2px #000`;

export class Hud {
  constructor() {
    this.nodes = Object.fromEntries(['mission','status','dispatch','garage','minimap','vehicle','dialogue','radio','weapons'].map(id => [id, document.getElementById(id)]));
    for (const node of Object.values(this.nodes)) { node.style.cssText = style; }
    Object.assign(this.nodes.mission.style, { left: '18px', top: '18px', width: '295px' });
    Object.assign(this.nodes.status.style, { right: '18px', top: '18px' });
    Object.assign(this.nodes.dispatch.style, { left: '18px', top: '126px', width: '260px' });
    Object.assign(this.nodes.garage.style, { left: '18px', top: '126px', width: '280px' });
    Object.assign(this.nodes.minimap.style, { right: '18px', bottom: '18px', width: '220px', height: '154px', padding: '0', border: '1px solid #dbc68e' });
    Object.assign(this.nodes.vehicle.style, { right: '18px', top: '86px' });
    Object.assign(this.nodes.dialogue.style, { left: '50%', bottom: '26px', transform: 'translateX(-50%)', width: 'min(540px, 72vw)', textAlign: 'center' });
    Object.assign(this.nodes.radio.style, { right: '18px', bottom: '186px' });
    Object.assign(this.nodes.weapons.style, { left: '18px', bottom: '18px' });
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
    this.nodes.status.innerHTML=`${stars}<br><b>$${snapshot.progress.money.toLocaleString()}</b> &nbsp; RESPECT ${snapshot.progress.respect}<br>HEALTH ${snapshot.combat.health}/100`;
    this.nodes.dispatch.innerHTML=dispatch.snapshot().map(line=>`<b>${line.callsign}</b> / ${line.text}`).join('<br>');
    const owned=snapshot.shop.catalog.filter(item=>item.owned);
    this.nodes.garage.innerHTML=owned.length?`<b>KITE &amp; KEY / MOTOR WORKS</b><br>${owned.map(item=>`✓ ${item.name} / ${item.effect}`).join('<br>')}<br>UPGRADES ${owned.length}/${snapshot.shop.catalog.length}`:'';
    this.nodes.vehicle.textContent=snapshot.player.mode==='driving'?`${snapshot.vehicleName} / ${Math.round(Math.abs(snapshot.player.speed)*3.6)} km/h`:snapshot.district.name;
    this.nodes.dialogue.textContent=mission.dialogue || 'MARA VENN / VERMILION BAY';
    this.nodes.radio.textContent='BAY FM / 88.6  •  Warm air, low tide';
    this.nodes.weapons.textContent=`${snapshot.combat.weapon.toUpperCase()}  /  ${snapshot.combat.ammo} ROUNDS`;
    this.drawMap(snapshot,city,police);
  }
}
