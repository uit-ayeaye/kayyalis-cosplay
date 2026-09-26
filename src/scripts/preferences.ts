import { navigate } from "astro:transitions/client";
import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from "astro:transitions/client";
const themeKey = "dada-theme";
const languageKey = "dada-language";
const languages = ".language-switch a, .cos-language a";
const getSaved = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
function setTheme(value = getSaved(themeKey)) {
  const dark = value === "dark" || (value !== "light" && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document
    .querySelectorAll("[data-theme-toggle]")
    .forEach((b) => b.setAttribute("aria-pressed", String(dark)));
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta)
    meta.content = dark
      ? "#211b28"
      : document.body.classList.contains("cosplay")
        ? "#fbf8f3"
        : "#fcf8f5";
}
function syncLinks() {
  document.querySelectorAll<HTMLAnchorElement>(languages).forEach((a) => {
    const url = new URL(a.href);
    url.hash = location.hash;
    url.search = location.search;
    a.href = url.href;
  });
  // These are separate applications; preferences follow through the shared origin.
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    if (
      a.origin === location.origin &&
      /^\/(?:keewadun-portfolio|kayyalis-cosplay)\//.test(a.pathname) &&
      a.pathname.split("/")[1] !== location.pathname.split("/")[1]
    )
      a.setAttribute("data-astro-reload", "");
  });
}
function changeLanguage(lang: string) {
  const a = [...document.querySelectorAll<HTMLAnchorElement>(languages)].find(
    (a) => a.hreflang === lang,
  );
  if (a && document.documentElement.lang !== lang) {
    syncLinks();
    void navigate(a.href);
  }
}
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const theme = event.target.closest<HTMLElement>("[data-theme-toggle]");
  if (theme) {
    const value =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    save(themeKey, value);
    setTheme(value);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      theme.animate(
        [{ scale: "1" }, { scale: ".88" }, { scale: "1.06" }, { scale: "1" }],
        { duration: 360, easing: "ease-out" },
      );
  }
  const language = event.target.closest<HTMLAnchorElement>(languages);
  if (
    language &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
    save(languageKey, language.hreflang);
});
window.addEventListener("storage", (event) => {
  if (event.key === themeKey || event.key === null) setTheme();
  if (event.key === languageKey && /^(en|th)$/.test(event.newValue || ""))
    changeLanguage(event.newValue!);
});
systemTheme.addEventListener("change", () => {
  if (!getSaved(themeKey)) setTheme();
});
window.addEventListener("hashchange", syncLinks);
// Warm only the alternate HTML document; media still loads on demand.
const documents = new Map<string, Promise<string>>();
function warmLanguage() {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  if (connection?.saveData) return;
  const alternate = [
    ...document.querySelectorAll<HTMLAnchorElement>(languages),
  ].find((a) => a.hreflang !== document.documentElement.lang);
  if (!alternate) return;
  const url = new URL(alternate.href);
  url.hash = "";
  if (!documents.has(url.href)) {
    const pending = fetch(url.href, {
      credentials: "same-origin",
      priority: "low",
    }).then((r) => {
      if (!r.ok) throw Error("Translation unavailable");
      return r.text();
    });
    documents.set(url.href, pending);
    void pending.catch(() => documents.delete(url.href));
    if (documents.size > 4) documents.delete(documents.keys().next().value!);
  }
}
const anchorSelector =
  "main h1, main h2, main .diary-photo, main .reel-card, main .event-row, main .work-card";
let restore:
  | {
      y: number;
      anchor: number;
      offset: number;
      values: [string, string][];
      buttons: [string, string][];
      photos: number;
      filmLeft: number;
    }
  | undefined;
const withoutLanguage = (path: string) => path.replace("/th/", "/");
document.addEventListener("astro:before-preparation", (event) => {
  const e = event as TransitionBeforePreparationEvent;
  restore = undefined;
  if (
    e.from.pathname === e.to.pathname ||
    withoutLanguage(e.from.pathname) !== withoutLanguage(e.to.pathname)
  )
    return;
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(anchorSelector),
  ];
  const anchor = candidates
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return (
        el.getClientRects().length && r.bottom > 110 && r.top < innerHeight
      );
    })
    .sort(
      (a, b) =>
        Math.abs(a.getBoundingClientRect().top - 110) -
        Math.abs(b.getBoundingClientRect().top - 110),
    )[0];
  restore = {
    y: scrollY,
    anchor: candidates.indexOf(anchor),
    offset: anchor?.getBoundingClientRect().top || 0,
    values: [
      ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "select[id], input[name]",
      ),
    ].map((el) => [
      el.id ? "#" + el.id : 'input[name="' + el.name + '"]',
      el.value,
    ]),
    buttons: [],
    photos: document.querySelectorAll(".diary-photo:not([hidden])").length,
    filmLeft: document.querySelector(".reel-track")?.scrollLeft || 0,
  };
  for (const attr of [
    "data-filter",
    "data-video-filter",
    "data-film-platform",
    "data-film-view",
  ])
    document
      .querySelectorAll<HTMLElement>("[" + attr + '][aria-pressed="true"]')
      .forEach((b) =>
        restore!.buttons.push([attr, b.getAttribute(attr) || ""]),
      );
  document.documentElement.setAttribute("data-language-swap", "");
  const url = new URL(e.to);
  url.hash = "";
  const cached = documents.get(url.href);
  const original = e.loader;
  if (cached)
    e.loader = async () => {
      try {
        const next = new DOMParser().parseFromString(await cached, "text/html");
        const currentStyles = [
          ...document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]"),
        ].map((l) => l.getAttribute("href"));
        if (
          !next.querySelector('[name="astro-view-transitions-enabled"]') ||
          [...next.querySelectorAll("link[rel=stylesheet]")].some(
            (l) => !currentStyles.includes(l.getAttribute("href")),
          )
        )
          return original();
        next.querySelectorAll("noscript").forEach((n) => n.remove());
        e.newDocument = next;
      } catch {
        return original();
      }
    };
});
document.addEventListener("astro:before-swap", (event) => {
  const e = event as TransitionBeforeSwapEvent;
  e.newDocument.documentElement.dataset.theme =
    document.documentElement.dataset.theme;
  e.newDocument.documentElement.dataset.softnav = "true";
  if (restore) {
    e.newDocument.documentElement.setAttribute("data-language-swap", "");
    e.viewTransition.skipTransition();
  }
});
document.addEventListener("astro:after-swap", () => {
  if (!restore) return;
  const state = restore;
  restore = undefined;
  // Initialize and restore controls synchronously, before the browser paints the new language.
  document.dispatchEvent(new Event("portfolio:localize"));
  for (const [attr, value] of state.buttons) {
    const b = document.querySelector<HTMLButtonElement>(
      "[" + attr + '="' + CSS.escape(value) + '"]',
    );
    if (b && b.getAttribute("aria-pressed") !== "true") b.click();
  }
  for (const [selector, value] of state.values) {
    const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      selector,
    );
    if (el) {
      el.value = value;
      el.dispatchEvent(
        new Event(el instanceof HTMLSelectElement ? "change" : "input", {
          bubbles: true,
        }),
      );
    }
  }
  const more = document.querySelector<HTMLButtonElement>(".load-more");
  while (
    more &&
    !more.hidden &&
    document.querySelectorAll(".diary-photo:not([hidden])").length <
      state.photos
  )
    more.click();
  const track = document.querySelector<HTMLElement>(".reel-track");
  if (track) track.scrollLeft = state.filmLeft;
  const anchor =
    document.querySelectorAll<HTMLElement>(anchorSelector)[state.anchor];
  window.scrollTo({
    top: anchor
      ? anchor.getBoundingClientRect().top + scrollY - state.offset
      : state.y,
    behavior: "instant",
  });
  setTheme();
  syncLinks();
});
document.addEventListener("astro:page-load", () => {
  setTheme();
  syncLinks();
  requestAnimationFrame(() =>
    document.documentElement.removeAttribute("data-language-swap"),
  );
  warmLanguage();
});
