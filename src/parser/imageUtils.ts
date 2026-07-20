// Browser-side canvas helpers. Detection runs at FULL resolution — detect.ts
// thresholds are calibrated against the original ~2770 px screenshots via the
// Node harness, so no downscaling here.
//
// IMPORTANT: this canvas holds the clean source image only. Debug overlays are
// SVG layers rendered by React on top — they never touch this canvas, so OCR
// can never see overlay labels.

import type { RawImage, Rect } from "./detect";
import { type GrayImage, grayToRgba } from "./preprocess";

export interface LoadedImage {
  raw: RawImage;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function loadImage(url: string): Promise<LoadedImage> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`Не успях да заредя изображението: ${url}`));
    el.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    raw: { data: data.data, width: canvas.width, height: canvas.height },
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}

export function clampRect(r: Rect, width: number, height: number): Rect {
  const x = Math.max(0, Math.min(Math.round(r.x), width - 1));
  const y = Math.max(0, Math.min(Math.round(r.y), height - 1));
  const w = Math.max(1, Math.min(Math.round(r.w), width - x));
  const h = Math.max(1, Math.min(Math.round(r.h), height - y));
  return { x, y, w, h };
}

/**
 * Colour crop as a JPEG data URL, downscaled to `maxDim` — used for situation
 * images and image answers. JPEG keeps localStorage cache sizes sane.
 */
export function cropToJpeg(src: LoadedImage, rect: Rect, maxDim = 700): string {
  const r = clampRect(rect, src.width, src.height);
  const scale = Math.min(1, maxDim / Math.max(r.w, r.h));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(r.w * scale));
  out.height = Math.max(1, Math.round(r.h * scale));
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src.canvas, r.x, r.y, r.w, r.h, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.85);
}

/** Encode a preprocessed grayscale image as a PNG data URL for Tesseract. */
export function grayToDataUrl(g: GrayImage): string {
  const canvas = document.createElement("canvas");
  canvas.width = g.width;
  canvas.height = g.height;
  const ctx = canvas.getContext("2d")!;
  const imgData = new ImageData(new Uint8ClampedArray(grayToRgba(g)), g.width, g.height);
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}
