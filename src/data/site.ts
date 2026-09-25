export const base = "/kayyalis-cosplay";
export const origin = "https://thomasdlynn.dev";
export type Lang = "en" | "th";
export const home = (lang: Lang) =>
  `/keewadun-portfolio/${lang === "th" ? "th/" : ""}`;
export const t = (lang: Lang, en: string, th: string) =>
  lang === "th" ? th : en;
