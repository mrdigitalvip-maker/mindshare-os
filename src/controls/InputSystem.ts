export type InputState = { thrust: number; strafe: number; boost: boolean };
export class InputSystem {
  state: InputState = { thrust: 0, strafe: 0, boost: false };
  private keys = new Set<string>();
  private sync = () => {
    this.state.thrust =
      Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) -
      Number(this.keys.has("KeyS") || this.keys.has("ArrowDown"));
    this.state.strafe =
      Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
      Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
    this.state.boost = this.keys.has("ShiftLeft");
  };
  private down = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    this.sync();
  };
  private up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.sync();
  };
  connect() {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
  }
  disconnect() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
  }
}
