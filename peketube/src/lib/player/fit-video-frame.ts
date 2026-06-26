const VIDEO_ASPECT = 16 / 9;

/** Tamaño máximo 16:9 dentro de un rectángulo (letterbox / pillarbox). */
export function fitVideoFrame16x9(
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number } {
  if (boxWidth <= 0 || boxHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const boxRatio = boxWidth / boxHeight;
  if (boxRatio > VIDEO_ASPECT) {
    const height = boxHeight;
    return { width: height * VIDEO_ASPECT, height };
  }
  const width = boxWidth;
  return { width, height: width / VIDEO_ASPECT };
}
