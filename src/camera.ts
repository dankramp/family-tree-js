import type { Node } from './familyLayout';

export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function animateCameraTo(
  camera: Camera,
  target: { x: number; y: number; scale: number },
  duration: number,
  onUpdate: () => void,
  onDone?: () => void
) {
  let animating = true;
  const animationStart = performance.now();
  const animationFrom = { x: camera.x, y: camera.y, scale: camera.scale };
  const animationTo = target;

  function step(now: number) {
    const elapsed = now - animationStart;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOut(t);
    camera.x = lerp(animationFrom.x, animationTo.x, eased);
    camera.y = lerp(animationFrom.y, animationTo.y, eased);
    camera.scale = lerp(animationFrom.scale, animationTo.scale, eased);
    onUpdate();
    if (t < 1 && animating) {
      requestAnimationFrame(step);
    } else {
      animating = false;
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}
