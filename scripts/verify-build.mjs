import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const base = "/kayyalis-cosplay";
const origin = "https://thomasdlynn.dev";
async function walk(dir) {
  return (
    await Promise.all(
      (await fs.readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : [path.join(dir, e.name)],
      ),
    )
  ).flat();
}
const files = await walk("dist");
const pages = files.filter((f) => f.endsWith(".html"));
assert.equal(pages.length, 25);
for (const file of pages) {
  const html = await fs.readFile(file, "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  if (file.endsWith("404.html")) continue;
  const route = file.slice(4).replace(/index\.html$/, "");
  assert.ok(
    html.includes(`rel="canonical" href="${origin}${base}${route}"`),
    file + " canonical",
  );
  assert.match(html, /hreflang="th"/);
  assert.match(html, /id="cos-menu"/);
  assert.match(html, /id="cos-media"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  for (const [, u] of html.matchAll(/(?:href|src|poster)="([^"#]+)"/g)) {
    if (!u.startsWith(base + "/")) continue;
    const local = u.split(/[?#]/)[0].slice(base.length);
    assert.ok(
      (
        await fs.stat(
          path.join("dist", local, local.endsWith("/") ? "index.html" : ""),
        )
      ).isFile(),
      `${file}: ${u}`,
    );
  }
  for (const [, json] of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(json);
}
const photos = JSON.parse(
  await fs.readFile("src/data/cosplay-photos.json", "utf8"),
);
const clips = JSON.parse(
  await fs.readFile("src/data/cosplay-videos.json", "utf8"),
);
assert.equal(new Set(clips.map((c) => c.id)).size, clips.length);
assert.equal(clips.filter((c) => c.platform === "TikTok").length, 21);
for (const c of clips)
  for (const suffix of [".mp4", "-preview.mp4", ".jpg"])
    assert.ok((await fs.stat(`dist/cosplay/videos/${c.id}${suffix}`)).size > 0);
for (const p of photos)
  for (const suffix of [".webp", "-small.webp"])
    assert.ok((await fs.stat(`dist/cosplay/photos/${p.id}${suffix}`)).size > 0);
const sitemap = await fs.readFile("dist/sitemap.xml", "utf8");
assert.equal((sitemap.match(/<loc>/g) || []).length, 24);
assert.ok(!sitemap.includes("keewadun-portfolio"));
console.log(
  JSON.stringify({
    pages: pages.length,
    indexablePages: 24,
    images: photos.length,
    clips: clips.length,
    standaloneCanonical: true,
    assets: "passed",
    structuredData: "valid",
  }),
);
