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

function encodeCrop(img: RawImage, rect: Rect, scale: number): Buffer {
  const bin = binarizeForOcr(cropGray(img, rect, scale));
  const out = new PNG({ width: bin.width, height: bin.height });
  out.data = Buffer.from(grayToRgba(bin));
  return PNG.sync.write(out);
}

const files = readdirSync(dir).filter((f) => /\.png$/i.test(f));
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
}
console.log(`\nUsable without manual review: ${pass}/${files.length}`);

// --- Optional OCR spot-check on the first N screenshots (real Tesseract). ---
if (withOcr) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("bul+eng");
  console.log("\nOCR spot-check:");
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
    for (const r0 of regions) {
      const r = { ...r0, rect: tightenTextRect(img, r0.rect) };
      const buf = encodeCrop(img, r.rect, r.scale);
      writeFileSync(join("scripts", "out", `${f.replace(/\W+/g, "_")}_${r.name.replace(/\W+/g, "_")}.png`), buf);
      const res = await worker.recognize(buf);
      const text = normalizeOcrText(res.data.text);
      const q = scoreOcrText(text);
      console.log(
        `  ${r.name.padEnd(12)} conf=${Math.round(res.data.confidence)} ok=${q.ok}${q.reason ? ` (${q.reason})` : ""}  "${text.slice(0, 80)}"`,
      );
    }
  }
  await worker.terminate();
}
