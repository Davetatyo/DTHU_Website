// Kockázat: how a 3D die is turned to show its value. The faces sit on a CSS cube
// (FACE_PLACEMENT, then translateZ(half)); the cube's transform brings the rolled face to the
// front. Order matters: CSS applies a transform list from right to left, so the screen-axis
// spin (rotateZ) must come first in the list (applied last), or it moves the side faces.

export type Angles = { x: number; y: number; z: number };

/** Where each face sits on the cube (CSS rotations before translateZ). */
export const FACE_PLACEMENT: Record<number, Angles> = {
  1: { x: 0, y: 0, z: 0 },
  6: { x: 0, y: 180, z: 0 },
  2: { x: 0, y: 90, z: 0 },
  5: { x: 0, y: -90, z: 0 },
  3: { x: 90, y: 0, z: 0 },
  4: { x: -90, y: 0, z: 0 },
};

/** The turn that brings each face to the front (before the extra tumbling turns). */
const TO_FRONT: Record<number, [number, number]> = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };

/** The cube's angles for a value; `spin` adds whole tumbling turns (and a quarter screen spin). */
export function cubeAngles(value: number, spin: number): Angles {
  const [x, y] = TO_FRONT[value];
  return { x: x + spin * 360, y: y + spin * 360, z: spin * 90 };
}

/** The CSS transform for the cube: the screen spin first in the list, so it's applied last. */
export const cubeTransform = (a: Angles) => `rotateZ(${a.z}deg) rotateX(${a.x}deg) rotateY(${a.y}deg)`;
export const faceTransform = (a: Angles) => `rotateX(${a.x}deg) rotateY(${a.y}deg)`;
