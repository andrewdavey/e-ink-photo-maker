import colorTableUrl from "./assets/N-color.act?url";

export type ColorTable = Array<{ r: number; g: number; b: number }>;

export const loadPresetColorTable = async () => {
  const response = await fetch(colorTableUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const colors: ColorTable = [];
  for (let i = 0; i < buffer.length; i += 3) {
    if (i + 2 < buffer.length) {
      colors.push({
        r: buffer[i],
        g: buffer[i + 1],
        b: buffer[i + 2],
      });
    }
  }
  return colors;
};
