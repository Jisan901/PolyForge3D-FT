/**
 * Safely extracts a displayable image source URL or Data URL from a Three.js Texture or target.
 */
export const extractImageSource = (target: any): string | null => {
  if (!target) return null;

  const image = target.image ?? target.source?.data;
  if (!image) return null;

  if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
    if (image.src) return image.src;
  }

  if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
    try {
      return image.toDataURL('image/png');
    } catch (e) {
      console.warn('[TextureEditor] Failed to get DataURL from canvas:', e);
    }
  }

  if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(image, 0, 0);
        return tempCanvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('[TextureEditor] Failed to convert ImageBitmap to DataURL:', e);
    }
  }

  // Handle DataTexture (raw pixel buffer)
  if (image.data && image.width && image.height) {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const imgData = tempCtx.createImageData(image.width, image.height);
        imgData.data.set(image.data);
        tempCtx.putImageData(imgData, 0, 0);
        return tempCanvas.toDataURL('image/png');
      }
    } catch (e) {
      console.warn('[TextureEditor] Failed to convert raw pixel data to DataURL:', e);
    }
  }

  return null;
};

/**
 * Updates a Three.js Texture with edited pixels.
 *
 * CRITICAL BUG FIX:
 * We NEVER assign the live DOM canvas ref directly to targetTexture.image.
 * If multiple textures share the same DOM canvas instance, selecting or modifying
 * one texture mutates ALL other textures (Texture A, B, C all becoming C).
 *
 * Instead, each texture receives its own dedicated offscreen canvas snapshot.
 */
export const updateTexturePixels = (
  targetTexture: any,
  sourceCanvas: HTMLCanvasElement
): void => {
  if (!targetTexture || !targetTexture.isTexture) return;

  // Create an independent offscreen canvas clone for this texture
  const dedicatedCanvas = document.createElement('canvas');
  dedicatedCanvas.width = sourceCanvas.width;
  dedicatedCanvas.height = sourceCanvas.height;
  const ctx = dedicatedCanvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, 0, 0);
  }

  targetTexture.image = dedicatedCanvas;

  if (targetTexture.source) {
    targetTexture.source.data = dedicatedCanvas;
    targetTexture.source.needsUpdate = true;
  }

  targetTexture.needsUpdate = true;
};
