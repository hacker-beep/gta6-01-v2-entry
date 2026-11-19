export class WantedSystem {
  constructor(state, city) {
    this.state = state;
    this.city = city;
    this.heat = new Map();
    this.level = 0;
    this.lastCrime = -100;
    this.cooldown = 0;
  }

  commitCrime(severity = 1, position = this.state.player.target) {
    const district = this.city.districtAt(position.x, position.z);
    const heat = Math.min(5, (this.heat.get(district.id) || 0) + Math.max(0.25, severity));
    this.heat.set(district.id, heat);
    this.level = Math.min(5, Math.max(this.level, Math.ceil(heat)));
    this.lastCrime = 0;
    this.cooldown = 0;
    this.state.setWantedLevel(this.level);
    this.state.emit('crime', { district: district.name, heat, level: this.level });
    return { district, heat, level: this.level };
  }

  heatAt(position = this.state.player.target) {
    return this.heat.get(this.city.districtAt(position.x, position.z).id) || 0;
  }

  update(dt, pursued = false) {
    this.lastCrime += dt;
    for (const [id, value] of this.heat) {
      const cooled = Math.max(0, value - dt * 0.002);
      if (cooled < 0.01) this.heat.delete(id);
      else this.heat.set(id, cooled);
    }
    if (!this.level || pursued || this.lastCrime < 12) return;
    this.cooldown += dt;
    if (this.cooldown >= 8) {
      this.cooldown = 0;
      this.level = Math.max(0, this.level - 1);
      this.state.setWantedLevel(this.level);
      this.state.emit('wanted-decay', this.level);
    }
  }

  setLevel(level) {
    this.level = Math.max(0, Math.min(5, Math.floor(level)));
    if (this.level > 0) this.lastCrime = 0;
    this.state.setWantedLevel(this.level);
    return this.level;
  }

  snapshot() {
    return { level: this.level, districtHeat: Object.fromEntries(this.heat), currentHeat: this.heatAt(), secondsSinceCrime: this.lastCrime };
  }
}
