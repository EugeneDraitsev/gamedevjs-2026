import { Shape } from "three";

export const createHolographicAxeBladeShape = () => {
  const shape = new Shape();

  shape.moveTo(-0.34, 0.34);
  shape.lineTo(0.06, 0.34);
  shape.quadraticCurveTo(0.56, 0.58, 0.96, 0.36);
  shape.quadraticCurveTo(0.7, 0.16, 0.56, 0.02);
  shape.quadraticCurveTo(0.76, -0.18, 0.92, -0.5);
  shape.quadraticCurveTo(0.42, -0.52, 0.06, -0.28);
  shape.lineTo(-0.34, -0.28);
  shape.quadraticCurveTo(-0.5, 0.02, -0.34, 0.34);

  return shape;
};
