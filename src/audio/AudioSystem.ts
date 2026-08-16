export class AudioSystem {
  private context?: AudioContext;
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  tone(frequency = 180) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.035, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.16);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + 0.16);
  }
}
