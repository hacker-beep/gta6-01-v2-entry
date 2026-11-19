/** Device sampling is independent from simulation ticks. Edges live until consumed. */
export class Input {
  constructor(element) {
    this.element = element;
    this.keys = new Set();
    this.edges = new Set();
    this.padButtons = new Set();
    this.orbit = { x: 0, y: 0 };
    this.zoom = 0;
    this.dragging = false;
    this.enabled = true;
    this.listeners = [];
    this.pad = null;
    this.install();
  }

  listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.listeners.push(() => target.removeEventListener(event, handler, options));
  }

  install() {
    const captured = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    this.listen(window, 'keydown', event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (captured.has(event.code)) event.preventDefault();
      if (!this.keys.has(event.code)) this.edges.add(event.code);
      this.keys.add(event.code);
    });
    this.listen(window, 'keyup', event => this.keys.delete(event.code));
    this.listen(window, 'blur', () => this.clear());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.clear();
    });
    this.listen(this.element, 'pointerdown', event => {
      this.dragging = true;
      this.element.focus();
      this.element.setPointerCapture(event.pointerId);
    });
    this.listen(this.element, 'pointerup', () => { this.dragging = false; });
    this.listen(this.element, 'pointercancel', () => { this.dragging = false; });
    this.listen(this.element, 'pointermove', event => {
      if (!this.dragging) return;
      this.orbit.x += event.movementX * 0.004;
      this.orbit.y += event.movementY * 0.003;
    });
    this.listen(this.element, 'wheel', event => {
      event.preventDefault();
      this.zoom += Math.sign(event.deltaY);
    }, { passive: false });
    this.listen(this.element, 'contextmenu', event => event.preventDefault());
  }

  deadzone(value, threshold = 0.16) {
    const magnitude = Math.abs(value || 0);
    return magnitude < threshold ? 0 : Math.sign(value) * (magnitude - threshold) / (1 - threshold);
  }

  poll() {
    const devices = navigator.getGamepads?.() || [];
    this.pad = Array.from(devices).find(Boolean) || null;
    const next = new Set();
    this.pad?.buttons.forEach((button, index) => {
      if (!button.pressed) return;
      next.add(index);
      if (!this.padButtons.has(index)) {
        if (index === 3) this.edges.add('KeyE');
        if (index === 9) this.edges.add('KeyP');
      }
    });
    this.padButtons = next;
    if (this.pad) {
      this.orbit.x += this.deadzone(this.pad.axes[2]) * 0.025;
      this.orbit.y += this.deadzone(this.pad.axes[3]) * 0.018;
    }
  }

  held(...codes) {
    return this.enabled && codes.some(code => this.keys.has(code));
  }

  take(code) {
    const present = this.edges.delete(code);
    return this.enabled && present;
  }

  axis(negative, positive) {
    return Number(this.held(...positive)) - Number(this.held(...negative));
  }

  movement() {
    let x = this.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
    let y = this.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']);
    if (this.enabled && this.pad) {
      const px = this.deadzone(this.pad.axes[0]);
      const py = -this.deadzone(this.pad.axes[1]);
      if (Math.abs(px) > Math.abs(x)) x = px;
      if (Math.abs(py) > Math.abs(y)) y = py;
    }
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x, y };
  }

  driving() {
    const move = this.movement();
    let throttle = move.y;
    if (this.enabled && this.pad) {
      const triggers = (this.pad.buttons[7]?.value || 0) - (this.pad.buttons[6]?.value || 0);
      if (Math.abs(triggers) > Math.abs(throttle)) throttle = triggers;
    }
    return {
      throttle,
      steering: move.x,
      brake: this.held('Space') || (this.enabled && this.padButtons.has(0)),
    };
  }

  sprinting() {
    return this.held('ShiftLeft', 'ShiftRight') || (this.enabled && this.padButtons.has(10));
  }

  consumeCamera() {
    const delta = { x: this.orbit.x, y: this.orbit.y, zoom: this.zoom };
    this.orbit.x = 0;
    this.orbit.y = 0;
    this.zoom = 0;
    return delta;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.clear();
  }

  isGamepadConnected() {
    return Boolean(this.pad?.connected);
  }

  describeDevice() {
    if (!this.pad) return { type: 'keyboard', name: 'Keyboard and pointer' };
    return {
      type: 'gamepad',
      name: this.pad.id,
      index: this.pad.index,
      mapping: this.pad.mapping,
    };
  }

  actionState() {
    const movement = this.movement();
    const driving = this.driving();
    return {
      enabled: this.enabled,
      movement,
      driving,
      sprint: this.sprinting(),
      dragging: this.dragging,
      device: this.describeDevice(),
    };
  }

  releasePointer() {
    this.dragging = false;
    this.orbit.x = 0;
    this.orbit.y = 0;
    this.zoom = 0;
  }

  hasFocus() {
    return document.activeElement === this.element && !document.hidden;
  }

  resetGamepad() {
    this.pad = null;
    this.padButtons.clear();
  }

  consumeAllEdges() {
    const result = Array.from(this.edges);
    this.edges.clear();
    return this.enabled ? result : [];
  }

  endFrame() {
    // Unhandled edges must not become future actions after changing contexts.
    this.edges.clear();
  }

  clear() {
    this.keys.clear();
    this.edges.clear();
    this.padButtons.clear();
    this.dragging = false;
    this.orbit.x = this.orbit.y = 0;
    this.zoom = 0;
  }

  dispose() {
    this.listeners.forEach(remove => remove());
    this.listeners.length = 0;
    this.clear();
  }
}
