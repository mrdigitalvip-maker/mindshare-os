export class GameLoop {
  private frame = 0;
  private last = 0;
  constructor(private update: (delta: number, time: number) => void) {}
  start() {
    const tick = (time: number) => {
      const delta = Math.min((time - this.last) / 1000, 0.05);
      this.last = time;
      this.update(delta, time / 1000);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  stop() {
    cancelAnimationFrame(this.frame);
  }
}
