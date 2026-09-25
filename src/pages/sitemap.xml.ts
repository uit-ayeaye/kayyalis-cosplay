import { characters, cosplayHome, characterPath } from "../data/cosplay";
import { origin } from "../data/site";
export function GET() {
  const routes = [
    { en: cosplayHome("en"), th: cosplayHome("th") },
    ...characters.map((c) => ({
      en: characterPath("en", c.id),
      th: characterPath("th", c.id),
    })),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${routes.flatMap((r) => [r.en, r.th].map((p) => `<url><loc>${origin}${p}</loc><xhtml:link rel="alternate" hreflang="en" href="${origin}${r.en}"/><xhtml:link rel="alternate" hreflang="th" href="${origin}${r.th}"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin}${r.en}"/></url>`)).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
