import { characterNotes } from "./character-notes";
import photos from "./cosplay-photos.json";
import clips from "./cosplay-videos.json";
import { base, type Lang } from "./site";
export { photos, clips };
export const cosplayHome = (lang: Lang) =>
  `${base}/${lang === "th" ? "th/" : ""}`;
export const characterPath = (lang: Lang, id: string) =>
  `${cosplayHome(lang)}${id}/`;
export const photoURL = (id: string, small = false) =>
  `${base}/cosplay/photos/${id}${small ? "-small" : ""}.webp`;
export const clipURL = (id: string, preview = false) =>
  `${base}/cosplay/videos/${id}${preview ? "-preview" : ""}.mp4`;
export const clipPoster = (id: string) => `${base}/cosplay/videos/${id}.jpg`;
const order = [
  "lynae",
  "miyabi",
  "reze",
  "yixuan",
  "evelyn",
  "robin",
  "feixiao",
  "giyu",
  "makima",
  "cc",
  "ubel",
];
export const characters = order.map((id) => {
  const items = photos.filter((p) => p.character === id);
  return {
    id,
    note: characterNotes[id],
    name: items[0].name,
    series: items[0].series,
    category: items[0].category,
    cover: items[0],
    photos: items,
    clips: clips.filter((c) => c.character === id),
  };
});
export type Character = (typeof characters)[number];
export const instagram = "https://www.instagram.com/kayyalis.cos/";
export const tiktok = "https://www.tiktok.com/@keewadun";
