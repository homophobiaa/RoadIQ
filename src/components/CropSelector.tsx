// Click-drag rectangle crop selector over a screenshot. Selection is tracked in
// fractional (0..1) coords relative to the displayed image, so it's independent
// of how the browser scaled the preview; on commit we crop from the image at its
// natural resolution into a PNG data URL.

import { useCallback, useRef, useState } from "react";

interface Frac {
  x: number;
  y: number;
}
interface Sel {
  a: Frac;
  b: Frac;
}

function norm(s: Sel) {
  const x = Math.min(s.a.x, s.b.x);
  const y = Math.min(s.a.y, s.b.y);
  const w = Math.abs(s.a.x - s.b.x);
  const h = Math.abs(s.a.y - s.b.y);
  return { x, y, w, h };
}

export function CropSelector({
  src,
  onCrop,
  onCancel,
}: {
  src: string;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const pointFrac = useCallback((e: React.MouseEvent): Frac => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const onDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = pointFrac(e);
    setSel({ a: p, b: p });
    setDragging(true);
  };
  const onMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setSel((s) => (s ? { ...s, b: pointFrac(e) } : s));
  };
  const onUp = () => setDragging(false);

  const commit = useCallback(
    async (full: boolean) => {
      setBusy(true);
      const region = full ? { x: 0, y: 0, w: 1, h: 1 } : sel ? norm(sel) : null;
      if (!region || region.w < 0.01 || region.h < 0.01) {
        setBusy(false);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const sx = region.x * img.naturalWidth;
        const sy = region.y * img.naturalHeight;
        const sw = region.w * img.naturalWidth;
        const sh = region.h * img.naturalHeight;
        // Cap output to keep localStorage data URLs reasonable.
        const scale = Math.min(1, 900 / Math.max(sw, sh));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(sw * scale));
        c.height = Math.max(1, Math.round(sh * scale));
        c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        onCrop(c.toDataURL("image/png"));
        setBusy(false);
      };
      img.onerror = () => setBusy(false);
      img.src = src;
    },
    [sel, src, onCrop],
  );

  const box = sel ? norm(sel) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-body">Завлечи правоъгълник върху снимката, за да изрежеш ситуацията.</p>
      <div
        ref={wrapRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        className="relative inline-block max-w-full cursor-crosshair select-none overflow-hidden rounded-md border border-hairline"
      >
        <img src={src} alt="crop" className="block max-h-[60vh] w-auto" draggable={false} />
        {box && (
          <div
            className="pointer-events-none absolute border-2 border-primary bg-primary/15"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={!box || busy} onClick={() => commit(false)}>
          Изрежи и запази
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => commit(true)}>
          Цялата снимка
        </button>
        <button className="btn-secondary" onClick={onCancel}>
          Отказ
        </button>
      </div>
    </div>
  );
}
