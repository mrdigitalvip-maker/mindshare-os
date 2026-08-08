import { useRef } from "react";

export function MobileControls({
  onMove,
  onInteract,
  onMenu,
}: {
  onMove: (x: number, y: number) => void;
  onInteract: () => void;
  onMenu: () => void;
}) {
  const origin = useRef({ x: 0, y: 0 });
  return (
    <div className="mobile-controls">
      <div
        className="joystick"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          onMove(
            Math.max(-1, Math.min(1, (e.clientX - origin.current.x) / 42)),
            Math.max(-1, Math.min(1, (e.clientY - origin.current.y) / 42)),
          );
        }}
        onPointerUp={() => onMove(0, 0)}
      >
        <i />
      </div>
      <div className="touch-look">DRAG TO LOOK</div>
      <button onClick={onInteract}>E</button>
      <button onClick={onMenu}>Ⅱ</button>
    </div>
  );
}
