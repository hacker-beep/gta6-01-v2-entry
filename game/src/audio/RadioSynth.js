export class RadioSynth {
  constructor(context) { this.context=context; }
  blip(frequency=660,duration=0.06) { if(!this.context)return;const oscillator=this.context.createOscillator();const gain=this.context.createGain();oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0.04,this.context.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,this.context.currentTime+duration);oscillator.connect(gain).connect(this.context.destination);oscillator.start();oscillator.stop(this.context.currentTime+duration); }
}
