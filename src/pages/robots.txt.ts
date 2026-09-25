import { base, origin } from "../data/site";
export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nSitemap: ${origin}${base}/sitemap.xml\n`,
    { headers: { "Content-Type": "text/plain" } },
  );
}
