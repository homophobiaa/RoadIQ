// Discovers screenshots placed in public/screenshots/.
//
// We use import.meta.glob to enumerate files at build time. Files under public/
// are served at the site root, so we map each matched module path to its public
// URL. This means the user only ever drops images into public/screenshots/ — no
// JSON, no upload flow.

import type { ScreenshotSource } from "../types";

export function loadScreenshotSources(): ScreenshotSource[] {
  // eager: false → just collect the keys (paths); we serve via public URL.
  const modules = import.meta.glob(
    "/public/screenshots/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}",
  );

  const sources: ScreenshotSource[] = Object.keys(modules)
    .map((path) => {
      // "/public/screenshots/foo.png" → served at "/screenshots/foo.png"
      const url = path.replace(/^\/public/, "");
      const fileName = url.split("/").pop() || url;
      return { fileName, url };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName, "bg"));

  return sources;
}
