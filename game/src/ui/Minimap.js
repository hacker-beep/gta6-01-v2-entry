export class Minimap {
  constructor() { this.visible = true; }
  marker(position, size = { width: 500, depth: 660 }) { return { x: (position.x + size.width/2)/size.width, y: (position.z + size.depth/2)/size.depth }; }
  snapshot(player, mission, police) { return { player: this.marker(player.target), mission: mission.active?.target ? this.marker(mission.active.target) : null, police: police.units.map(unit => this.marker(unit.position)) }; }
}
