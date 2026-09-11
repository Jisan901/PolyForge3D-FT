export const getPattern = (
  ctx: CanvasRenderingContext2D,
  type: string,
  color: string
): string | CanvasPattern => {
  if (type === 'solid') return color;

  const pCanvas = document.createElement('canvas');
  pCanvas.width = 16;
  pCanvas.height = 16;
  const pCtx = pCanvas.getContext('2d');
  if (!pCtx) return color;

  pCtx.fillStyle = color;
  if (type === 'checkerboard') {
    pCtx.fillRect(0, 0, 8, 8);
    pCtx.fillRect(8, 8, 8, 8);
  } else if (type === 'dots') {
    pCtx.beginPath();
    pCtx.arc(8, 8, 4, 0, Math.PI * 2);
    pCtx.fill();
  } else if (type === 'stripes') {
    pCtx.fillRect(0, 0, 16, 4);
    pCtx.fillRect(0, 8, 16, 4);
  } else if (type === 'grid') {
    pCtx.fillRect(0, 0, 16, 2);
    pCtx.fillRect(0, 0, 2, 16);
  } else if (type === 'noise') {
    for (let x = 0; x < 16; x += 2) {
      for (let y = 0; y < 16; y += 2) {
        if ((x * 37 + y * 13) % 5 === 0 || (x * 17 + y * 23) % 7 === 0) {
          pCtx.fillRect(x, y, 2, 2);
        }
      }
    }
  }

  return ctx.createPattern(pCanvas, 'repeat') || color;
};
