export function createBitmap(
  width: number,
  height: number,
  imageData: ImageData
) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  let offset = 0;

  // BMP Header
  view.setUint8(offset++, 0x42); // B
  view.setUint8(offset++, 0x4d); // M
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint32(offset, 0, true);
  offset += 4; // Reserved
  view.setUint32(offset, 54, true);
  offset += 4; // Data offset

  // DIB Header
  view.setUint32(offset, 40, true);
  offset += 4; // Header size
  view.setInt32(offset, width, true);
  offset += 4;

  // Positive height  => bottom-up bitmap (device-friendly)
  view.setInt32(offset, height, true);
  offset += 4;

  view.setUint16(offset, 1, true);
  offset += 2; // Planes
  view.setUint16(offset, 24, true);
  offset += 2; // Bits per pixel
  view.setUint32(offset, 0, true);
  offset += 4; // No compression
  view.setUint32(offset, imageSize, true);
  offset += 4;
  view.setInt32(offset, 2835, true);
  offset += 4; // X pixels per meter
  view.setInt32(offset, 2835, true);
  offset += 4; // Y pixels per meter
  view.setUint32(offset, 0, true);
  offset += 4; // Total colors
  view.setUint32(offset, 0, true);
  offset += 4; // Important colors

  // Pixel Data
  const data = imageData.data;
  let p = 54;

  // Write rows from bottom to top
  for (let y = height - 1; y >= 0; y--) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row.push(data[i + 2], data[i + 1], data[i]); // BGR
    }
    // Pad row to multiple of 4 bytes
    while (row.length < rowSize) row.push(0);
    new Uint8Array(buffer, p, rowSize).set(row);
    p += rowSize;
  }

  return buffer;
}
