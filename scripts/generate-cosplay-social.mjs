import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
const photos = JSON.parse(
  await readFile("src/data/cosplay-photos.json", "utf8"),
);
await mkdir("public/social", { recursive: true });
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
for (const id of ["kayyalis", ...new Set(photos.map((p) => p.character))]) {
  const p = photos.find(
    (p) => p.character === (id === "kayyalis" ? "lynae" : id),
  );
  const image = await sharp(`public/cosplay/photos/${p.id}.webp`)
    .resize(450, 558, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();
  const text = id === "kayyalis" ? "A different world." : p.name;
  const line = id === "kayyalis" ? "Still a little me." : p.series;
  const svg = Buffer.from(
    `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="630" fill="#f5effa"/><circle cx="950" cy="170" r="320" fill="#e8def5"/><circle cx="75" cy="590" r="210" fill="#f1d5dc"/><text x="58" y="93" font-family="Arial" font-weight="bold" font-size="38" letter-spacing="-2" fill="#352442">kayyalis ✿</text><text x="58" y="128" font-family="Arial" font-size="12" letter-spacing="3" fill="#72609a">DADA’S COSPLAY UNIVERSE</text><text x="58" y="280" font-family="Georgia" font-size="${text.length > 15 ? 49 : 62}" fill="#352442">${escape(text)}</text><text x="58" y="353" font-family="Georgia" font-style="italic" font-size="${line.length > 25 ? 27 : 44}" fill="#72609a">${escape(line)}</text><text x="58" y="440" font-family="Arial" font-size="19" fill="#796b80">Characters · Photo diary · Little transformations</text><rect x="58" y="510" width="210" height="44" rx="22" fill="#352442"/><text x="82" y="538" font-family="Arial" font-size="16" fill="#fbf8f3">@kayyalis.cos</text><text x="300" y="538" font-family="Arial" font-size="14" fill="#796b80">Kunwadee · Dada</text><rect x="713" y="28" width="466" height="574" rx="28" fill="#ffffff"/></svg>`,
  );
  await sharp(svg)
    .composite([{ input: image, left: 721, top: 36 }])
    .jpeg({ quality: 91 })
    .toFile(`public/social/cosplay-${id}.jpg`);
}
console.log("Generated 12 cosplay social thumbnails");
