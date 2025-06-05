import type { ColorTable } from "./colorTable";

export const floydSteinbergDither = (
  imageData: ImageData,
  colorTable: ColorTable
): ImageData => {
  if (colorTable.length === 0) {
    return imageData; // No color table loaded
  }

  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  const getColorDistance = (
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ) => {
    return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
  };

  const findNearestColor = (r: number, g: number, b: number) => {
    let minDist = Infinity;
    let nearest = { r: 0, g: 0, b: 0 };
    for (const c of colorTable) {
      const dist = getColorDistance(r, g, b, c.r, c.g, c.b);
      if (dist < minDist) {
        minDist = dist;
        nearest = c;
      }
    }
    return nearest;
  };

  const idx = (x: number, y: number) => (y * width + x) * 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const oldR = data[i];
      const oldG = data[i + 1];
      const oldB = data[i + 2];
      const newColor = findNearestColor(oldR, oldG, oldB);

      const errR = oldR - newColor.r;
      const errG = oldG - newColor.g;
      const errB = oldB - newColor.b;

      data[i] = newColor.r;
      data[i + 1] = newColor.g;
      data[i + 2] = newColor.b;

      const diffuse = (dx: number, dy: number, factor: number) => {
        const ni = idx(x + dx, y + dy);
        if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
          data[ni] = Math.max(0, Math.min(255, data[ni] + errR * factor));
          data[ni + 1] = Math.max(
            0,
            Math.min(255, data[ni + 1] + errG * factor)
          );
          data[ni + 2] = Math.max(
            0,
            Math.min(255, data[ni + 2] + errB * factor)
          );
        }
      };

      diffuse(1, 0, 7 / 16);
      diffuse(-1, 1, 3 / 16);
      diffuse(0, 1, 5 / 16);
      diffuse(1, 1, 1 / 16);
    }
  }

  return imageData;
};
