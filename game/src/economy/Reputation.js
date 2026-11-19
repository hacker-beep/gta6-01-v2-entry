export class Reputation {
  constructor(state) { this.state = state; this.tier = 'New face'; }
  update() {
    const respect = this.state.values.respect;
    this.tier = respect >= 10 ? 'Bay legend' : respect >= 5 ? 'Trusted operator' : respect >= 2 ? 'Known quantity' : 'New face';
  }
  award(amount = 1) { this.state.setRespect(this.state.values.respect + amount); this.update(); return this.tier; }
  snapshot() { this.update(); return { respect: this.state.values.respect, tier: this.tier, money: this.state.values.money }; }
}
