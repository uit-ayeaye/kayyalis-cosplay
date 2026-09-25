# Kayyalis — cosplay diary

Independent bilingual cosplay portfolio for Kunwadee (Dada). Live at https://thomasdlynn.dev/kayyalis-cosplay/. The MC portfolio remains at https://thomasdlynn.dev/keewadun-portfolio/ and is an optional outbound link only. This project has its own source, build, assets, metadata, sitemap and deployment.

## Development

Node 22.12 or later. Run `npm ci`, `npm run dev` (port 4322), and `npm run build`. The build checks TypeScript, all 24 indexable pages, local asset links, metadata, JSON-LD, sitemap and media inventory. GitHub Actions publishes the static `dist` directory on pushes to main.

## Content and sources

Audit: 26 September 2026. The accessible TikTok profile exposed 68 posts: 63 videos and 5 photo posts. Twenty videos were clearly tagged cosplay; review of untagged/transition candidates found one additional C.C. clip (7469411805891136776). The portfolio includes all 21 cosplay TikTok videos identified in that accessible inventory, plus five Instagram reels. TikTok indicated some posts are unavailable without login; this is not a claim to include inaccessible or private posts. Everyday and MC posts are deliberately outside this cosplay collection.

Instagram provided 20 accessible posts: 15 photo carousels/posts and five reels. The 68 gallery assets include 67 photographic/composite images and one explicitly labeled Miyabi reaction illustration. Source post links and supplied photographer credits are retained per image. Video counts refer to source posts, so cross-posted reels may repeat a look.

Original media is archived locally outside this repository in `../Kayyalis source media/`. Full website videos preserve the best available downloaded source resolution, encoded to H.264/AAC for compatibility without upscaling. Silent six-second previews are separate smaller files. At most two visible previews play; offscreen/hidden-page/modal previews pause. Reduced-motion and data-saving preferences, and a manual pause control, are respected.

## Experience

Eleven character pages per language, concise bilingual visual notes, character accents, photo filters, credited lightbox, surprise photo, TikTok/Reels filters, character video filters, filmstrip/grid views, desktop drag inertia, native touch momentum, arrow navigation, keyboard-accessible dialogs, animated mobile menu and chapter dock. Scrolling remains native; there is no wheel hijacking. Motion uses reduced-motion fallbacks.

Each indexable route has a canonical URL, EN/TH hreflang, Open Graph/Twitter metadata and a 1200×630 character-specific social image. JSON-LD describes the person, site, image gallery and video posts. Generate social thumbnails with `node scripts/generate-cosplay-social.mjs`.

## Shared preferences and soft navigation

Theme and language controls use the same origin-wide preference keys as the MC site. Theme changes sync between open tabs. English/Thai page switches use Astro ClientRouter, keeping cinema filters, view mode and reading position. Page-level event listeners use AbortSignal cleanup and video observers disconnect before swaps. Reduced-motion preferences disable decorative motion. Pen-drawn SVG stars, hearts and orbit details require no raster image downloads.
