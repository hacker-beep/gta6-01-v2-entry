export class Menus {
  constructor(onPause) { this.onPause = onPause; this.screen = 'play'; }
  toggle() { this.screen = this.screen === 'play' ? 'paused' : 'play'; this.onPause(this.screen === 'paused'); return this.screen; }
  gameOver(reason = 'WASTED') { this.screen = 'game-over'; this.reason = reason; }
  snapshot() { return { screen: this.screen, reason: this.reason || '' }; }
}
