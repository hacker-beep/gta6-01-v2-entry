import { RadioSynth } from './RadioSynth.js';
export class AudioEngine {
  constructor() { this.context=null;this.radio=null;this.muted=true; }
  start() { if(this.context)return;const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){this.context=new Audio();this.radio=new RadioSynth(this.context);} }
  blip(frequency,duration) { this.start();if(!this.muted)this.radio?.blip(frequency,duration); }
  setMuted(value) { this.muted=Boolean(value); }
  dispose() { this.context?.close();this.context=null;this.radio=null; }
}
