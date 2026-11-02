import { describe, expect, it } from "vitest";
import { cubeAngles, FACE_PLACEMENT } from "./dice-cube";

// CSS rotation matrices (y points down), applied to column vectors; a transform list A B C
// is the product A·B·C.
type M = number[][];
const rad = (d: number) => (d * Math.PI) / 180;
const rx = (d: number): M => [[1, 0, 0], [0, Math.cos(rad(d)), -Math.sin(rad(d))], [0, Math.sin(rad(d)), Math.cos(rad(d))]];
const ry = (d: number): M => [[Math.cos(rad(d)), 0, Math.sin(rad(d))], [0, 1, 0], [-Math.sin(rad(d)), 0, Math.cos(rad(d))]];
const rz = (d: number): M => [[Math.cos(rad(d)), -Math.sin(rad(d)), 0], [Math.sin(rad(d)), Math.cos(rad(d)), 0], [0, 0, 1]];
const mul = (a: M, b: M): M => a.map((row, i) => b[0].map((_, j) => row.reduce((s, _, k) => s + a[i][k] * b[k][j], 0)));
const apply = (m: M, v: number[]) => m.map((row) => row.reduce((s, c, k) => s + c * v[k], 0));

/** Which face looks at the viewer (+z) for the cube transform the game uses. */
function front(value: number, spin: number): number {
  const a = cubeAngles(value, spin);
  const cube = mul(mul(rz(a.z), rx(a.x)), ry(a.y)); // rotateZ rotateX rotateY
  for (const [face, p] of Object.entries(FACE_PLACEMENT)) {
    const normal = apply(mul(rx(p.x), ry(p.y)), [0, 0, 1]); // face: rotateX rotateY, then translateZ
    if (apply(cube, normal)[2] > 0.99) return Number(face);
  }
  return 0;
}

describe("3D die", () => {
  it("shows the rolled value at every spin", () => {
    for (let value = 1; value <= 6; value++)
      for (let spin = 0; spin < 12; spin++) expect(front(value, spin), `value ${value}, spin ${spin}`).toBe(value);
  });
});
