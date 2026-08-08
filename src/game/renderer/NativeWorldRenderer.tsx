import { useEffect, useRef } from "react";
import { ASTRA_GEOMETRY } from "@/game/world/starbase/layout";
import { cameraPosition } from "@/game/camera/controller";
import type { PlayerState } from "@/game/types";

const vertex = `attribute vec3 p;uniform mat4 m;uniform vec3 offset;uniform vec3 scale;varying float depth;void main(){vec4 q=m*vec4(p*scale+offset,1.);depth=clamp(1.-q.z/80.,.2,1.);gl_Position=q;}`;
const fragment = `precision mediump float;uniform vec3 color;uniform float glow;varying float depth;void main(){gl_FragColor=vec4(color*(depth+glow),1.);}`;
const cube = new Float32Array([
  -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1,
  -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, -1, -1, -1, 1, 1, -1, 1, 1, 1,
  1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, 1, 1, 1, 1, -1, 1, -1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1, 1, 1, -1, -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, 1, 1, 1, -1,
]);
function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}
function perspective(
  yaw: number,
  pitch: number,
  pos: { x: number; y: number; z: number },
  aspect: number,
) {
  const f = 1 / Math.tan(0.55),
    n = 0.05,
    fa = 100,
    cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  const view = [cy, sy * sp, -sy * cp, 0, 0, cp, sp, 0, sy, -cy * sp, cy * cp, 0, 0, 0, 0, 1];
  view[12] = -(view[0] * pos.x + view[4] * pos.y + view[8] * pos.z);
  view[13] = -(view[1] * pos.x + view[5] * pos.y + view[9] * pos.z);
  view[14] = -(view[2] * pos.x + view[6] * pos.y + view[10] * pos.z);
  const proj = [
      f / aspect,
      0,
      0,
      0,
      0,
      f,
      0,
      0,
      0,
      0,
      (fa + n) / (n - fa),
      -1,
      0,
      0,
      (2 * fa * n) / (n - fa),
      0,
    ],
    out = Array(16).fill(0);
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += proj[k * 4 + r] * view[c * 4 + k];
  return new Float32Array(out);
}
export function NativeWorldRenderer({
  player,
  onLook,
  onPointerLock,
}: {
  player: PlayerState;
  onLook: (x: number, y: number) => void;
  onPointerLock: (v: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    state = useRef(player);
  state.current = player;
  useEffect(() => {
    const canvas = ref.current!,
      gl = canvas.getContext("webgl", { antialias: player.settings.quality !== "low" });
    if (!gl) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    gl.useProgram(program);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, cube, gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(program, n);
    let raf = 0;
    const render = () => {
      const s = state.current,
        q = s.settings.quality,
        dpr = Math.min(devicePixelRatio, q === "high" ? 1.5 : q === "medium" ? 1.15 : 0.8),
        w = innerWidth,
        h = innerHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.005, 0.012, 0.025, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      const cam = cameraPosition(s.position, s.settings.yaw, s.settings.camera),
        mat = perspective(s.settings.yaw, s.settings.pitch, cam, w / h);
      gl.uniformMatrix4fv(u("m"), false, mat);
      for (const o of ASTRA_GEOMETRY) {
        gl.uniform3f(u("offset"), o.position.x, o.position.y, o.position.z);
        gl.uniform3f(u("scale"), o.scale.x / 2, o.scale.y / 2, o.scale.z / 2);
        gl.uniform3fv(u("color"), o.color);
        gl.uniform1f(u("glow"), o.emissive ? 0.7 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, cube.length / 3);
      }
      // Aurora I: fuselage, wings, cockpit and twin cyan engines.
      const ship = [
        [0, 1.3, -31, 2, 1.2, 7, 0.18, 0.23, 0.28],
        [-3, 1, -31, 5, 0.2, 4, 0.12, 0.16, 0.2],
        [3, 1, -31, 5, 0.2, 4, 0.12, 0.16, 0.2],
        [0, 1.8, -29, 1.3, 0.5, 2, 0.05, 0.5, 0.7],
        [-1, 1.2, -34, 0.5, 0.5, 0.5, 0, 0.8, 1],
        [1, 1.2, -34, 0.5, 0.5, 0.5, 0, 0.8, 1],
      ];
      for (const x of ship) {
        gl.uniform3f(u("offset"), x[0], x[1], x[2]);
        gl.uniform3f(u("scale"), x[3] / 2, x[4] / 2, x[5] / 2);
        gl.uniform3f(u("color"), x[6], x[7], x[8]);
        gl.uniform1f(u("glow"), x[7] > 0.4 ? 0.8 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, cube.length / 3);
      }
      raf = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [player.settings.quality]);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (document.pointerLockElement === ref.current) onLook(e.movementX, e.movementY);
    };
    const lock = () => onPointerLock(document.pointerLockElement === ref.current);
    document.addEventListener("mousemove", move);
    document.addEventListener("pointerlockchange", lock);
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("pointerlockchange", lock);
    };
  }, [onLook, onPointerLock]);
  return (
    <canvas
      ref={ref}
      className="space-canvas"
      aria-label="Astra Outpost playable 3D world"
      onClick={() => ref.current?.requestPointerLock()}
    />
  );
}
