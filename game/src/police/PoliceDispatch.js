const CALLSIGNS = ['Harbor 12', 'Unit 4 Cedar', 'North 21', 'Bay 6', 'Air 1'];
const LINES = [
  'All units, suspect vehicle moving through the district.',
  'Patrols take the next cross street. Keep civilians clear.',
  'Air unit has a visual. Ground units close the net.',
  'Road control requested. Set the barrier ahead of the target.',
  'Suspect last seen near the waterfront. Proceed with caution.',
];

export class PoliceDispatch {
  constructor() { this.messages = []; this.elapsed = 0; this.lastLevel = 0; }

  update(dt, level, district = 'Vermilion Bay') {
    this.elapsed += dt;
    if (level && (level !== this.lastLevel || this.elapsed > 11)) {
      const index = (this.messages.length + level) % LINES.length;
      this.messages.unshift({ callsign: CALLSIGNS[index], text: LINES[index], district, age: 0 });
      this.messages.length = Math.min(3, this.messages.length);
      this.elapsed = 0;
    }
    this.lastLevel = level;
    for (const message of this.messages) message.age += dt;
    this.messages = this.messages.filter(message => message.age < 18);
  }

  escalation(level) { return { patrols: level >= 1, roadblocks: level >= 3, helicopter: level >= 3 }; }
  snapshot() { return this.messages.map(message => ({ ...message })); }
}
