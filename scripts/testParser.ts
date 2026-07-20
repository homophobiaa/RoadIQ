// Headless detection test against the REAL screenshots in public/screenshots/.
// Runs the exact same pure detection code the browser uses (src/parser/detect.ts).
//
//   npx tsx scripts/testParser.ts            # summary table
//   npx tsx scripts/testParser.ts --verbose  # + warnings, icon geometry

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { detectLayout, validateDetection, tightenTextRect, type RawImage, type Rect } from "../src/parser/detect";
import { cropGray, binarizeForOcr, grayToRgba, normalizeOcrText, scoreOcrText } from "../src/parser/preprocess";

const dir = join(import.meta.dirname, "..", "public", "screenshots");
const verbose = process.argv.includes("--verbose");
const withOcr = process.argv.includes("--ocr");
const ocrLimit = withOcr ? parseInt(process.argv[process.argv.indexOf("--ocr") + 1] || "4", 10) : 0;
// --dump: save situation-image and image-answer crops for visual inspection.
const dump = process.argv.includes("--dump");

function saveColorCrop(img: RawImage, rect: Rect, name: string) {
  const x0 = Math.max(0, Math.round(rect.x));
  const y0 = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(img.width - x0, Math.round(rect.w)));
  const h = Math.max(1, Math.min(img.height - y0, Math.round(rect.h)));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * img.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  writeFileSync(join("scripts", "out", name), PNG.sync.write(out));
}

function encodeCrop(img: RawImage, rect: Rect, scale: number): Buffer {
  const bin = binarizeForOcr(cropGray(img, rect, scale));
  const out = new PNG({ width: bin.width, height: bin.height });
  out.data = Buffer.from(grayToRgba(bin));
  return PNG.sync.write(out);
}

const filterArg = process.argv.indexOf("--files");
const filter = filterArg >= 0 ? process.argv[filterArg + 1].split(",") : null;
const files = readdirSync(dir)
  .filter((f) => /\.png$/i.test(f))
  .filter((f) => !filter || filter.some((s) => f.includes(s)));
let pass = 0;

// Ground truth from manual visual inspection (answers count / layout).
// null = not yet manually labelled; detection result is just printed.
const expected: Record<string, { layout: string; answers: number } | null> = {};

console.log(`Testing ${files.length} screenshots\n`);
for (const f of files) {
  const png = PNG.sync.read(readFileSync(join(dir, f)));
  const img: RawImage = {
    data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length),
    width: png.width,
    height: png.height,
  };
  const det = detectLayout(img);
  const val = validateDetection(det);
  const correctCount = det.answers.filter((a) => a.correct).length;
  const status = val.usable ? "OK " : "REVIEW";
  if (val.usable) pass++;

  console.log(
    `${status}  ${f.padEnd(36)} ${det.layout.padEnd(26)} answers=${det.answers.length} correct=${correctCount} title_h=${det.titleRect?.h}`,
  );
  if (verbose) {
    for (const w of [...det.warnings, ...val.warnings]) console.log(`        ⚠ ${w}`);
    for (const ic of det.icons) {
      console.log(
        `        icon ${(ic.correct ? "✓" : "✗")} cx=${Math.round(ic.cx)} cy=${Math.round(ic.cy)} ${Math.round(ic.width)}x${Math.round(ic.height)} conf=${ic.confidence.toFixed(2)}`,
      );
    }
    if (det.situationRect) {
      const s = det.situationRect;
      console.log(`        situation x=${s.x} y=${s.y} w=${s.w} h=${s.h}`);
    }
  }
  const exp = expected[f];
  if (exp && (exp.layout !== det.layout || exp.answers !== det.answers.length)) {
    console.log(`   MISMATCH: expected ${exp.layout}/${exp.answers}`);
  }
  if (det.layout === "image-left-text-right" && !det.situationRect) {
    console.log("        ⚠ B-layout but NO situation rect");
  }
  if (dump) {
    const base = f.replace(/\W+/g, "_");
    if (det.situationRect) saveColorCrop(img, det.situationRect, `${base}__situation.png`);
    det.answers.forEach((a, i) => {
      if (a.imageRect) saveColorCrop(img, a.imageRect, `${base}__card${i + 1}.png`);
      if (a.rect && det.layout === "horizontal-image-answers")
        saveColorCrop(img, a.rect, `${base}__cardfull${i + 1}.png`);
    });
  }
}
console.log(`\nUsable without manual review: ${pass}/${files.length}`);

// --- Optional OCR spot-check on the first N screenshots (real Tesseract),
//     running the exact shared browser pipeline (ocrPipeline.ts). ---
if (withOcr) {
  const Tesseract = (await import("tesseract.js")).default;
  const { createWorker } = await import("tesseract.js");
  const { ocrRegionPipeline } = await import("../src/parser/ocrPipeline");
  const { grayToRgba: toRgba } = await import("../src/parser/preprocess");
  const worker = await createWorker("bul+eng");

  const recognize = async (g: { data: Uint8ClampedArray; width: number; height: number }, psm: string) => {
    await worker.setParameters({ tessedit_pageseg_mode: psm as Tesseract.PSM });
    const out = new PNG({ width: g.width, height: g.height });
    out.data = Buffer.from(toRgba(g));
    const res = await worker.recognize(PNG.sync.write(out));
    return { text: res.data.text ?? "", confidence: res.data.confidence ?? 0 };
  };

  console.log("\nOCR spot-check (shared pipeline):");
  for (const f of files.slice(0, ocrLimit)) {
    const png = PNG.sync.read(readFileSync(join(dir, f)));
    const img: RawImage = {
      data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length),
      width: png.width,
      height: png.height,
    };
    const det = detectLayout(img);
    console.log(`\n== ${f} (${det.layout})`);
    const regions: { name: string; rect: Rect; scale: number }[] = [
      ...(det.titleRect ? [{ name: "title", rect: det.titleRect, scale: 1.6 }] : []),
      ...det.answers
        .filter((a) => a.textRect)
        .map((a, i) => ({ name: `answer${i + 1} ${a.correct ? "✓" : "✗"}`, rect: a.textRect!, scale: 2 })),
    ];
    for (const r of regions) {
      const out = await ocrRegionPipeline(img, r.rect, recognize, { baseScale: r.scale });
      if (dump) {
        saveColorCrop(img, r.rect, `${f.replace(/\W+/g, "_")}_${r.name.replace(/\W+/g, "_")}_RAW.png`);
        saveColorCrop(img, out.rect, `${f.replace(/\W+/g, "_")}_${r.name.replace(/\W+/g, "_")}_TIGHT.png`);
      }
      const tries = out.attempts.map((a) => `${a.psm}/${a.confidence}`).join(" ");
      console.log(
        `  ${r.name.padEnd(12)} ok=${out.ok} comb=${out.confidence.combined.toFixed(2)} [${tries}]${out.reason ? ` (${out.reason})` : ""}  "${out.text.slice(0, 70)}"`,
      );
    }
  }
  await worker.terminate();
}
