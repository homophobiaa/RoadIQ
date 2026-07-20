// Pure, DOM-free detection core for Avtoizpit result screenshots.
//
// This module deliberately contains NO canvas/DOM code so the exact same logic
// can run headless in Node (scripts/testParser.ts) against the real screenshots
// in public/screenshots/ — detection is validated on real data, not synthetic.
//
// Observed ground truth (visually inspected across all repo screenshots):
//   - Full-page screenshots ~2750–2790 px wide.
//   - Title: dark text on a light band at the top, full width.
//   - Result icons: glossy circles Ø ≈ 1.3–2.2 % of image width — green with a
//     white check (correct) or muted red with a white X (wrong).
//   - Layout A (vertical-text): 2–4 full-width answer bars; icons stacked in a
//     right-edge column (x ≳ 90 % of width). Bars may be WHITE (unselected,
//     dark text) or DARK GREY (user-selected, white text).
//   - Layout B (image-left-text-right): situation photo on the left (~40 % of
//     width), answer bars on the right; icons in the same right-edge column.
//     Photos can contain green traffic lights / red road signs — never trust
//     colour alone, always geometry + the right-column stack.
//   - Layout C (horizontal-image-answers): 2–4 square-ish image cards in one
//     row below the title; one icon at the right edge of EACH card, all icons
//     sharing the same Y (card vertical centre), evenly spaced in X.

export interface RawImage {
  data: Uint8ClampedArray; // RGBA
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedResultIcon {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
  correct: boolean;
  confidence: number;
}

export type QuestionLayout =
  | "vertical-text"
  | "image-left-text-right"
  | "horizontal-image-answers"
  | "unknown";

export interface DetectedAnswerRegion {
  /** Full region of the answer (bar or card). */
  rect: Rect;
  /** Text crop for OCR (vertical layouts) — excludes icon column and image. */
  textRect?: Rect;
  /** Image crop (layout C card content). */
  imageRect?: Rect;
  icon: DetectedResultIcon;
  correct: boolean;
}

export interface DetectedLayout {
  layout: QuestionLayout;
  titleRect: Rect | null;
  situationRect: Rect | null;
  answers: DetectedAnswerRegion[];
  icons: DetectedResultIcon[];
  /** All raw icon candidates before filtering — debug only. */
  rejectedIcons: DetectedResultIcon[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Pixel classifiers
// ---------------------------------------------------------------------------

function px(img: RawImage, x: number, y: number): number {
  return (y * img.width + x) * 4;
}

/** Saturated icon green (glossy check circle). Foliage also passes — geometry filters it later. */
function isIconGreen(r: number, g: number, b: number): boolean {
  return g > 90 && g - r > 28 && g - b > 20;
}
/** Icon red — includes the muted/pink X used on both white and grey bars. */
function isIconRed(r: number, g: number, b: number): boolean {
  return r > 120 && r - g > 38 && r - b > 30;
}

function lum(d: Uint8ClampedArray, i: number): number {
  return (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
}

// ---------------------------------------------------------------------------
// 1. Icon detection — connected components on a green|red mask
// ---------------------------------------------------------------------------

interface Blob {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: number;
  green: number;
  red: number;
  sumX: number;
  sumY: number;
}

export function detectIcons(img: RawImage): {
  icons: DetectedResultIcon[];
  rejected: DetectedResultIcon[];
} {
  const { width, height, data } = img;
  // Fine sampling: icons are ~40–60 px; a 4 px cell keeps them ~10–15 cells wide.
  const ds = Math.max(2, Math.round(width / 700));
  const mw = Math.ceil(width / ds);
  const mh = Math.ceil(height / ds);
  const kind = new Uint8Array(mw * mh); // 0 none, 1 green, 2 red

  for (let my = 0; my < mh; my++) {
    const sy = Math.min(height - 1, my * ds);
    for (let mx = 0; mx < mw; mx++) {
      const sx = Math.min(width - 1, mx * ds);
      const i = px(img, sx, sy);
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isIconGreen(r, g, b)) kind[my * mw + mx] = 1;
      else if (isIconRed(r, g, b)) kind[my * mw + mx] = 2;
    }
  }

  // Connected components (4-neighbour flood fill).
  const seen = new Uint8Array(mw * mh);
  const blobs: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mw * mh; start++) {
    if (!kind[start] || seen[start]) continue;
    seen[start] = 1;
    stack.length = 0;
    stack.push(start);
    const b: Blob = {
      minX: mw,
      maxX: 0,
      minY: mh,
      maxY: 0,
      size: 0,
      green: 0,
      red: 0,
      sumX: 0,
      sumY: 0,
    };
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % mw;
      const y = (idx / mw) | 0;
      b.size++;
      b.sumX += x;
      b.sumY += y;
      if (kind[idx] === 1) b.green++;
      else b.red++;
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (y < b.minY) b.minY = y;
      if (y > b.maxY) b.maxY = y;
      const nb = [x > 0 ? idx - 1 : -1, x < mw - 1 ? idx + 1 : -1, idx - mw, idx + mw];
      for (const n of nb) {
        if (n < 0 || n >= mw * mh || seen[n] || !kind[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    blobs.push(b);
  }

  // Geometry filters. Icon diameter ≈ 1.3–2.2 % of width; allow slack.
  const minD = width * 0.008;
  const maxD = width * 0.035;
  const icons: DetectedResultIcon[] = [];
  const rejected: DetectedResultIcon[] = [];

  for (const b of blobs) {
    const w = (b.maxX - b.minX + 1) * ds;
    const h = (b.maxY - b.minY + 1) * ds;
    const cx = (b.sumX / b.size) * ds;
    const cy = (b.sumY / b.size) * ds;
    const fill = b.size / ((b.maxX - b.minX + 1) * (b.maxY - b.minY + 1));
    const aspect = w / h;
    const correct = b.green >= b.red;
    // Confidence from how circle-like the blob is.
    const sizeOk = w >= minD && w <= maxD && h >= minD && h <= maxD;
    // Real result icons measure 44–52 px and are near-square (0.85–1.15 observed);
    // photo fragments (stripes, taillights) are elongated or tiny.
    const aspectOk = aspect > 0.7 && aspect < 1.45;
    const fillOk = fill > 0.35; // circle with white glyph hole ≈ 0.45–0.7
    const icon: DetectedResultIcon = {
      x: b.minX * ds,
      y: b.minY * ds,
      width: w,
      height: h,
      cx,
      cy,
      correct,
      confidence: (sizeOk ? 0.4 : 0) + (aspectOk ? 0.3 : 0) + (fillOk ? 0.3 : 0),
    };
    if (sizeOk && aspectOk && fillOk) icons.push(icon);
    else rejected.push(icon);
  }

  // Dedup: merge icons whose centres are closer than one diameter.
  const merged: DetectedResultIcon[] = [];
  for (const ic of icons.sort((a, b) => b.confidence - a.confidence)) {
    const dup = merged.find(
      (m) => Math.abs(m.cx - ic.cx) < m.width && Math.abs(m.cy - ic.cy) < m.height,
    );
    if (!dup) merged.push(ic);
  }
  return { icons: merged, rejected };
}

// ---------------------------------------------------------------------------
// 2. Title-bottom detection — dark-text row profile with gap cutoff
// ---------------------------------------------------------------------------

/**
 * Scans down from the top counting rows that contain dark text on a light
 * background. The title block ends at the first vertical gap larger than
 * `gapTol` — everything below is content (answers / images), which we never
 * allow to leak into the title.
 */
export function detectTitleBottom(img: RawImage): number {
  const { width, height, data } = img;
  const stride = Math.max(1, Math.floor(width / 400));
  const gapTol = Math.round(height * 0.055);
  const scanLimit = Math.round(height * 0.6);

  let lastTextRow = -1;
  let firstTextRow = -1;
  let gap = 0;
  for (let y = 2; y < scanLimit; y++) {
    let dark = 0;
    let samples = 0;
    for (let x = Math.round(width * 0.005); x < width * 0.995; x += stride) {
      const i = px(img, x, y);
      if (lum(data, i) < 90) dark++;
      samples++;
    }
    const isText = dark / samples > 0.004; // a text line lights up ≥ ~0.5 % of a row
    if (isText) {
      if (firstTextRow === -1) firstTextRow = y;
      lastTextRow = y;
      gap = 0;
    } else if (firstTextRow !== -1) {
      gap++;
      if (gap > gapTol) break;
    }
  }
  if (lastTextRow === -1) return Math.round(height * 0.16); // fallback: typical band
  return lastTextRow + Math.round(height * 0.012);
}

// ---------------------------------------------------------------------------
// 3. Edge-density column profile — separates photos from flat bars.
//    (Uniform grey selected-bars have almost no vertical-edge rows; photos do.)
// ---------------------------------------------------------------------------

/**
 * Situation-image detection as a 2D problem. The app UI is pure greyscale, so
 * saturation is the photo signal — but photos contain desaturated stretches
 * (grey road, white sky) and the page footer has a pale decorative colour
 * swirl. Per-column 1D runs proved fragile on the real screenshots, so this
 * uses a block grid + connected components instead:
 *   - divide the candidate area into small blocks and mark saturated ones;
 *   - take the largest 4-connected saturated region;
 *   - accept its bounding box only when it starts near the left margin, is
 *     ≥15 % of image width and covers ≥40 % of the band height (the footer
 *     swirl is a thin strip and dies on the height requirement).
 */
function detectLeftImage(
  img: RawImage,
  y0: number,
  y1: number,
  x1: number,
): { left: number; right: number } {
  const { data, width, height } = img;
  const x0 = Math.round(width * 0.005);
  // Keep the footer's decorative gradient out of the measurement.
  const yEnd = Math.min(y1, Math.round(height * 0.88));
  if (yEnd - y0 < 40 || x1 - x0 < 40) return { left: 0, right: 0 };

  const gw = 48;
  const gh = 16;
  const bw = (x1 - x0) / gw;
  const bh = (yEnd - y0) / gh;
  const photo = new Uint8Array(gw * gh);

  for (let by = 0; by < gh; by++) {
    for (let bx = 0; bx < gw; bx++) {
      let satSum = 0;
      let n = 0;
      const px0 = Math.round(x0 + bx * bw);
      const py0 = Math.round(y0 + by * bh);
      const xs = Math.max(1, Math.floor(bw / 6));
      const ys = Math.max(1, Math.floor(bh / 6));
      for (let y = py0; y < py0 + bh && y < height; y += ys) {
        for (let x = px0; x < px0 + bw && x < width; x += xs) {
          const i = px(img, Math.round(x), Math.round(y));
          satSum += Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
          n++;
        }
      }
      // >13: real photos average 15–40 saturation; the faint blue tint on
      // selected grey bars and the footer swirl stay below this.
      if (n && satSum / n > 13) photo[by * gw + bx] = 1;
    }
  }

  // Largest connected saturated region.
  const seen = new Uint8Array(gw * gh);
  let best = { minX: 0, maxX: 0, minY: 0, maxY: 0, size: 0 };
  const stack: number[] = [];
  for (let s = 0; s < gw * gh; s++) {
    if (!photo[s] || seen[s]) continue;
    seen[s] = 1;
    stack.length = 0;
    stack.push(s);
    const reg = { minX: gw, maxX: 0, minY: gh, maxY: 0, size: 0 };
    while (stack.length) {
      const idx = stack.pop()!;
      const bx = idx % gw;
      const by = (idx / gw) | 0;
      reg.size++;
      if (bx < reg.minX) reg.minX = bx;
      if (bx > reg.maxX) reg.maxX = bx;
      if (by < reg.minY) reg.minY = by;
      if (by > reg.maxY) reg.maxY = by;
      const nb = [bx > 0 ? idx - 1 : -1, bx < gw - 1 ? idx + 1 : -1, idx - gw, idx + gw];
      for (const nIdx of nb) {
        if (nIdx < 0 || nIdx >= gw * gh || seen[nIdx] || !photo[nIdx]) continue;
        seen[nIdx] = 1;
        stack.push(nIdx);
      }
    }
    if (reg.size > best.size) best = reg;
  }

  if (best.size === 0) return { left: 0, right: 0 };
  const left = Math.round(x0 + best.minX * bw);
  const right = Math.round(x0 + (best.maxX + 1) * bw);
  const regionH = (best.maxY - best.minY + 1) * bh;
  const okLeft = left < width * 0.12;
  const okWidth = right - left > width * 0.15;
  const okHeight = regionH > (yEnd - y0) * 0.4;
  // A real situation image occupies the LEFT part only. A region reaching all
  // the way to the icon column is tinted answer-bars, not a photo.
  const okNotFullWidth = right < x1 * 0.8;
  if (okLeft && okWidth && okHeight && okNotFullWidth) return { left, right };
  return { left: 0, right: 0 };
}

/** Row-range refinement of the situation image inside its column range. */
function refineImageRows(img: RawImage, x0: number, x1: number, y0: number, y1: number): { top: number; bottom: number } {
  const { data } = img;
  const xStride = Math.max(1, Math.floor((x1 - x0) / 120));
  let top = y1;
  let bottom = y0;
  for (let y = y0; y < y1; y += 2) {
    let edges = 0;
    let n = 0;
    for (let x = x0; x < x1; x += xStride) {
      const iT = px(img, x, Math.max(0, y - 2));
      const iB = px(img, x, Math.min(img.height - 1, y + 2));
      if (Math.abs(lum(data, iT) - lum(data, iB)) > 18) edges++;
      const i = px(img, x, y);
      const sat = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
      if (sat > 45) edges++;
      n++;
    }
    if (edges / n > 0.15) {
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (bottom <= top) return { top: y0, bottom: y1 };
  return { top: Math.max(y0, top - 4), bottom: Math.min(y1, bottom + 4) };
}

// ---------------------------------------------------------------------------
// 4. Full layout detection
// ---------------------------------------------------------------------------

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

export function detectLayout(img: RawImage): DetectedLayout {
  const { width } = img;
  const warnings: string[] = [];
  const { icons: allIcons, rejected } = detectIcons(img);
  const titleBottom = detectTitleBottom(img);
  const titleRect: Rect = { x: 0, y: 0, w: width, h: titleBottom };

  // Icons must live below the title band.
  const contentIcons = allIcons.filter((ic) => ic.cy > titleBottom);

  if (contentIcons.length === 0) {
    warnings.push("Не са открити икони за верен/грешен отговор.");
    return { layout: "unknown", titleRect, situationRect: null, answers: [], icons: [], rejectedIcons: rejected, warnings };
  }

  // --- Right-column stack: the strongest vertical-layout signal. ---
  const rightCol = contentIcons.filter((ic) => ic.cx > width * 0.85);
  const colXs = rightCol.map((ic) => ic.cx);
  const stackAligned =
    rightCol.length >= 2 &&
    Math.max(...colXs) - Math.min(...colXs) < median(rightCol.map((ic) => ic.width)) * 1.5;

  if (stackAligned) {
    // Vertical layout (A or B). Drop everything outside the icon column —
    // green traffic lights / red signs inside photos die here.
    const dropped = contentIcons.length - rightCol.length;
    if (dropped > 0) warnings.push(`${dropped} цветни обекта извън колоната с икони бяха игнорирани.`);
    return detectVertical(img, rightCol.sort((a, b) => a.cy - b.cy), titleRect, rejected, warnings);
  }

  // --- Horizontal image answers (layout C): all icons on one Y line, spread in X. ---
  // Card photos contain small red/green fragments (taillights, stripes) that
  // pass the blob filters, so first keep only icons matching the dominant icon
  // size (±35 % of the median) — result icons are visually identical circles.
  const medW = median(contentIcons.map((ic) => ic.width));
  const medH = median(contentIcons.map((ic) => ic.height));
  const uniform = contentIcons.filter(
    (ic) =>
      Math.abs(ic.width - medW) < medW * 0.35 && Math.abs(ic.height - medH) < medH * 0.35,
  );
  const ys = uniform.map((ic) => ic.cy);
  const yAligned =
    uniform.length >= 2 &&
    Math.max(...ys) - Math.min(...ys) < median(uniform.map((ic) => ic.height)) * 1.2;
  const xs = uniform.map((ic) => ic.cx).sort((a, b) => a - b);
  const xSpread = xs.length ? xs[xs.length - 1] - xs[0] : 0;
  if (yAligned && xSpread > width * 0.3) {
    // Even-spacing check: card grids are regular. If a photo fragment slipped
    // through the filters, retry with each single icon removed — the real card
    // icons alone will form an even chain.
    const evenSubset = (set: DetectedResultIcon[]): DetectedResultIcon[] | null => {
      const sorted = [...set].sort((a, b) => a.cx - b.cx);
      const sxs = sorted.map((ic) => ic.cx);
      if (sorted.length < 2 || sxs[sxs.length - 1] - sxs[0] < width * 0.3) return null;
      if (sorted.length === 2) return sorted;
      const gaps: number[] = [];
      for (let i = 1; i < sxs.length; i++) gaps.push(sxs[i] - sxs[i - 1]);
      const g0 = median(gaps);
      return gaps.every((g) => Math.abs(g - g0) < g0 * 0.35) ? sorted : null;
    };
    let cards = evenSubset(uniform);
    if (!cards && uniform.length > 2 && uniform.length <= 6) {
      for (let skip = 0; skip < uniform.length && !cards; skip++) {
        cards = evenSubset(uniform.filter((_, i) => i !== skip));
      }
    }
    if (cards && cards.length >= 2 && cards.length <= 4) {
      const dropped = contentIcons.length - cards.length;
      if (dropped > 0) warnings.push(`${dropped} цветни фрагмента в картинките бяха игнорирани.`);
      return detectHorizontalCards(img, cards, titleRect, rejected, warnings);
    }
  }

  // Only one icon in the right column → still treat as vertical, but it will
  // fail validation (<2 answers) and land in review instead of inventing rows.
  if (rightCol.length === 1) {
    warnings.push("Открита е само една икона — въпросът изисква ръчна проверка.");
    return detectVertical(img, rightCol, titleRect, rejected, warnings);
  }

  warnings.push("Разположението не можа да бъде класифицирано.");
  return { layout: "unknown", titleRect, situationRect: null, answers: [], icons: contentIcons, rejectedIcons: rejected, warnings };
}

function detectVertical(
  img: RawImage,
  icons: DetectedResultIcon[],
  titleRect: Rect,
  rejected: DetectedResultIcon[],
  warnings: string[],
): DetectedLayout {
  const { width, height } = img;
  const iconH = median(icons.map((ic) => ic.height));
  const iconLeft = Math.min(...icons.map((ic) => ic.x));

  // Row bounds: midpoints between neighbouring icon centres; outer rows get
  // half the median gap (or a sensible default for 1–2 answers).
  const centers = icons.map((ic) => ic.cy);
  const gaps: number[] = [];
  for (let i = 1; i < centers.length; i++) gaps.push(centers[i] - centers[i - 1]);
  const halfGap = gaps.length ? median(gaps) / 2 : Math.min(height * 0.14, (height - titleRect.h) / 2.5);
  const contentTop = titleRect.h;
  // 0.93: the decorative footer gradient starts around 92 % height — letting
  // the last answer row reach into it feeds gradient speckle to OCR.
  const contentBottom = Math.min(height * 0.93, centers[centers.length - 1] + halfGap);

  const rows = icons.map((ic, i) => {
    const top = i === 0 ? Math.max(contentTop, ic.cy - halfGap) : (centers[i - 1] + ic.cy) / 2;
    const bottom = i === icons.length - 1 ? contentBottom : (ic.cy + centers[i + 1]) / 2;
    return { top: Math.round(top), bottom: Math.round(bottom), icon: ic };
  });

  // A vs B: photo block on the left of the answer column?
  const bandTop = Math.round(rows[0].top);
  const bandBottom = Math.round(rows[rows.length - 1].bottom);
  const { left: imgLeft, right: imgRight } = detectLeftImage(
    img,
    bandTop,
    bandBottom,
    Math.round(iconLeft - width * 0.02),
  );

  let layout: QuestionLayout = "vertical-text";
  let situationRect: Rect | null = null;
  let answersLeft = Math.round(width * 0.008);
  if (imgRight > 0) {
    layout = "image-left-text-right";
    const rowsRange = refineImageRows(img, imgLeft, imgRight, bandTop, bandBottom);
    situationRect = {
      x: imgLeft,
      y: rowsRange.top,
      w: imgRight - imgLeft,
      h: rowsRange.bottom - rowsRange.top,
    };
    answersLeft = Math.round(imgRight + width * 0.015);
  }

  const textPad = Math.round(iconH * 0.15);
  const answers: DetectedAnswerRegion[] = rows.map((r) => {
    const textX = answersLeft + Math.round(width * 0.004);
    // Text ends before the icon column (icon left minus one icon width of slack).
    const textW = Math.max(40, Math.round(r.icon.x - iconH * 0.8) - textX);
    return {
      rect: { x: answersLeft, y: r.top, w: width - answersLeft, h: r.bottom - r.top },
      textRect: {
        x: textX,
        y: r.top + textPad,
        w: textW,
        h: r.bottom - r.top - textPad * 2,
      },
      icon: r.icon,
      correct: r.icon.correct,
    };
  });

  return { layout, titleRect, situationRect, answers, icons, rejectedIcons: rejected, warnings };
}

function detectHorizontalCards(
  img: RawImage,
  icons: DetectedResultIcon[],
  titleRect: Rect,
  rejected: DetectedResultIcon[],
  warnings: string[],
): DetectedLayout {
  const { width, height } = img;
  const contentTop = titleRect.h + Math.round(height * 0.01);
  const iconY = median(icons.map((ic) => ic.cy));
  // Icons sit at the vertical centre of the cards → mirror around the icon line.
  const cardBottom = Math.min(Math.round(height * 0.97), Math.round(2 * iconY - contentTop));

  const xs = icons.map((ic) => ic.cx);
  const answers: DetectedAnswerRegion[] = icons.map((ic, i) => {
    const left = i === 0 ? Math.round(width * 0.005) : Math.round((xs[i - 1] + xs[i]) / 2 + ic.width * 0.6);
    const right = Math.round(ic.x + ic.width * 1.1);
    const rect: Rect = { x: left, y: contentTop, w: right - left, h: cardBottom - contentTop };
    // Image content: card interior minus the icon strip on the right.
    const pad = Math.round(ic.width * 0.35);
    const imageRect: Rect = {
      x: left + pad,
      y: contentTop + pad,
      w: Math.round(ic.x - ic.width * 0.3) - left - pad * 2,
      h: cardBottom - contentTop - pad * 2,
    };
    return { rect, imageRect, icon: ic, correct: ic.correct };
  });

  return {
    layout: "horizontal-image-answers",
    titleRect,
    situationRect: null,
    answers,
    icons,
    rejectedIcons: rejected,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// 5. Validation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 6. Ink-bounding-box tightening — shrinks a text crop to where the actual
//    glyphs are. Short answers left huge blank space inside their full-row
//    crop, and Tesseract hallucinates garbage text/warnings in that empty
//    area (confirmed against real screenshots). Works for both dark-on-light
//    and light-on-dark cards: "ink" = pixels far from the crop's modal
//    (background) luminance, not "dark pixels" specifically.
// ---------------------------------------------------------------------------

export function tightenTextRect(img: RawImage, rect: Rect, padPx = 10): Rect {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w = Math.min(img.width - x0, Math.round(rect.w));
  const h = Math.min(img.height - y0, Math.round(rect.h));
  if (w < 4 || h < 4) return rect;

  const lums = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      lums[y * w + x] = lum(img.data, px(img, x0 + x, y0 + y));
    }
  }

  // Ink = local high-frequency contrast (glyph stroke edges), NOT deviation
  // from a global background estimate — the answer bars have smooth gradient
  // shading that spans 20–40 luminance levels across the whole row, which a
  // "far from background" test misreads as ink over the entire blank area.
  // A 1px-step horizontal+vertical gradient stays near zero on a smooth
  // gradient but spikes sharply at glyph edges.
  const gradThresh = 22;
  const isInk = (x: number, y: number) => {
    const c = lums[y * w + x];
    const gx = Math.abs(c - lums[y * w + x - 1]) + Math.abs(c - lums[y * w + x + 1]);
    const gy = Math.abs(c - lums[(y - 1) * w + x]) + Math.abs(c - lums[(y + 1) * w + x]);
    return gx > gradThresh || gy > gradThresh;
  };

  // Card border/shadow lines run near the FULL crop width on 1–3 px rows —
  // real glyph rows never cover more than ~50 % of columns even for long
  // sentences (inter-letter/word gaps keep per-row ink sparse). Excluding
  // high-coverage rows drops borders without touching genuine text.
  const rowCoverage = new Float32Array(h);
  for (let y = 1; y < h - 1; y++) {
    let n = 0;
    for (let x = 1; x < w - 1; x++) if (isInk(x, y)) n++;
    rowCoverage[y] = n / (w - 2);
  }

  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let y = 1; y < h - 1; y++) {
    if (rowCoverage[y] > 0.55) continue; // border/shadow line, not text
    let rowInk = 0;
    for (let x = 1; x < w - 1; x++) if (isInk(x, y)) rowInk++;
    if (rowInk > 2) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let x = 1; x < w - 1; x++) {
        if (isInk(x, y)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    // No ink found (blank answer) — keep a small placeholder near the origin
    // rather than the full blank rect, so OCR sees nothing and reports empty.
    return { x: rect.x, y: rect.y, w: Math.min(rect.w, 60), h: rect.h };
  }
  return {
    x: Math.max(rect.x, x0 + minX - padPx),
    y: Math.max(rect.y, y0 + minY - padPx),
    w: Math.min(rect.w, maxX - minX + padPx * 2),
    h: Math.min(rect.h, maxY - minY + padPx * 2),
  };
}

export interface ParseValidation {
  usable: boolean;
  warnings: string[];
}

export function validateDetection(det: DetectedLayout): ParseValidation {
  const warnings: string[] = [];
  if (det.layout === "unknown") warnings.push("Неразпознато разположение на въпроса.");
  const n = det.answers.length;
  if (n < 2) warnings.push(`Открити са ${n} отговора — очакват се между 2 и 4.`);
  if (n > 4) warnings.push(`Открити са ${n} отговора — повече от очакваните 4.`);
  if (!det.answers.some((a) => a.correct)) warnings.push("Няма нито един верен отговор.");
  if (det.titleRect) {
    for (const a of det.answers) {
      if (a.rect.y < det.titleRect.h - 4) {
        warnings.push("Отговор застъпва заглавната зона.");
        break;
      }
    }
  }
  if (det.situationRect && det.layout === "image-left-text-right") {
    const iconLeft = Math.min(...det.icons.map((ic) => ic.x));
    if (det.situationRect.x + det.situationRect.w > iconLeft) {
      warnings.push("Ситуационната снимка застъпва колоната с икони.");
    }
  }
  const usable =
    det.layout !== "unknown" && n >= 2 && n <= 4 && det.answers.some((a) => a.correct);
  return { usable, warnings };
}
