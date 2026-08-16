export class CameraSystem {
  x = 0;
  y = 0;
  follow(target: { x: number; y: number }, dt: number) {
    this.x += (target.x - this.x) * Math.min(1, dt * 2);
    this.y += (target.y - this.y) * Math.min(1, dt * 2);
  }
}
