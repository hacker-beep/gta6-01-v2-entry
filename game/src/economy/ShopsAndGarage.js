const UPGRADES = [
  { id: 'engine', name: 'Engine tune', cost: 250, effect: 'Top speed +8%' },
  { id: 'armor', name: 'Reinforced panels', cost: 450, effect: 'Vehicle durability +20%' },
  { id: 'pistol', name: 'Service pistol', cost: 1200, effect: 'Pistol +24 rounds' },
  { id: 'nitrous', name: 'Nitrous kit', cost: 2500, effect: 'Boost acceleration +25%' },
];

export class ShopsAndGarage {
  constructor(state, player) { this.state = state; this.player = player; this.owned = new Set(); this.lastPurchase = ''; }
  buy(id) {
    const item = UPGRADES.find(entry => entry.id === id); if (!item) throw Error(`Unknown upgrade: ${id}`);
    if (this.state.values.money < item.cost) return { ok: false, reason: 'Insufficient funds', item };
    this.state.setMoney(this.state.values.money - item.cost); this.owned.add(id); this.lastPurchase = item.name;
    if (id === 'engine' && this.player.car) this.player.car.spec.topSpeed *= 1.08;
    if (id === 'nitrous' && this.player.car) this.player.car.spec.acceleration *= 1.25;
    this.state.emit('purchase', item); return { ok: true, item, balance: this.state.values.money };
  }
  catalog() { return UPGRADES.map(item => ({ ...item, owned: this.owned.has(item.id) })); }
  snapshot() { return { catalog: this.catalog(), lastPurchase: this.lastPurchase, money: this.state.values.money }; }
}
