// Low-level Canvas helpers shared across the parser pipeline.

export interface LoadedImage {
  img: HTMLImageElement;
  width: number;
  height: number;
  /** Full-frame pixel data, used for color/layout analysis. */
  data: ImageData;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Loads an image URL into an offscreen canvas. We optionally downscale very
 * large screenshots before analysis to keep per-pixel scans fast; cropping for
 * OCR is still done against this (possibly scaled) canvas so coords stay
 * consistent throughout the pipeline.
 */
export async function loadImage(url: string, maxDim = 1400): Promise<LoadedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Не успях да заредя изображението: ${url}`));
    el.src = url;
  });

  let { naturalWidth: width, naturalHeight: height } = img;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);

  return { img, width, height, data, canvas, ctx };
}

/** Clamp a rect into image bounds (defensive against bad heuristics). */
export function clampRect(r: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(r.x, width - 1));
  const y = Math.max(0, Math.min(r.y, height - 1));
  const w = Math.max(1, Math.min(r.w, width - x));
  const h = Math.max(1, Math.min(r.h, height - y));
  return { x, y, w, h };
}

/**
 * Crops a region from the source canvas and returns it upscaled 2x as a PNG
 * data URL. Upscaling helps Tesseract on small mobile-screenshot text.
 */
export function cropToDataUrl(src: LoadedImage, rect: Rect, upscale = 2): string {
  const r = clampRect(rect, src.width, src.height);
  const out = document.createElement("canvas");
  out.width = Math.round(r.w * upscale);
  out.height = Math.round(r.h * upscale);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(src.canvas, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** Plain crop (no upscale) — used for the situation image preview. */
export function cropPreview(src: LoadedImage, rect: Rect): string {
  const r = clampRect(rect, src.width, src.height);
  const out = document.createElement("canvas");
  out.width = r.w;
  out.height = r.h;
  out.getContext("2d")!.drawImage(src.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return out.toDataURL("image/png");
}
