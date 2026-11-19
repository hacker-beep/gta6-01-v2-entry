import { STORY_MISSIONS } from './StoryMissions.js';

export class MissionDirector {
  constructor(state) { this.state = state; this.index = 0; this.stage = 0; this.active = null; this.dialogue = ''; this.completed = []; }
  start(index = this.index) {
    const mission = STORY_MISSIONS[Math.max(0, Math.min(STORY_MISSIONS.length - 1, index))];
    this.index = mission.id; this.active = mission; this.stage = 0; this.dialogue = mission.dialogue;
    this.state.emit('mission-start', mission); return mission;
  }
  advance() {
    if (!this.active) return false;
    this.stage++;
    this.state.emit('mission-objective', { mission: this.active, stage: this.stage });
    if (this.stage >= 1) return this.complete();
    return true;
  }
  complete() {
    if (!this.active) return false;
    const mission = this.active; this.completed.push(mission.id);
    this.state.setMoney(this.state.values.money + mission.reward);
    this.state.setRespect(this.state.values.respect + 1);
    this.active = null; this.index = Math.min(STORY_MISSIONS.length - 1, mission.id + 1);
    this.dialogue = `JOB COMPLETE / ${mission.name} / +$${mission.reward}`;
    this.state.emit('mission-complete', mission); return mission;
  }
  fail(reason = 'Mission failed') { const mission = this.active; this.active = null; this.dialogue = reason; this.state.emit('mission-fail', { mission, reason }); return false; }
  update() {
    if (!this.active) return;
    const p = this.state.player.target; const target = this.active.target;
    if (Math.hypot(p.x - target.x, p.z - target.z) < 9) this.complete();
  }
  snapshot() { return { active: this.active, index: this.index, stage: this.stage, completed: this.completed.length, dialogue: this.dialogue }; }
}
