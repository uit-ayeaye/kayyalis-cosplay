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
let restore:
  | {
      y: number;
      section: string;
      offset: number;
      values: [string, string][];
      buttons: [string, string, string][];
    }
  | undefined;
const withoutLanguage = (path: string) => path.replace("/th/", "/");
document.addEventListener("astro:before-preparation", (event) => {
  const e = event as TransitionBeforePreparationEvent;
  restore = undefined;
  if (
    e.from.pathname !== e.to.pathname &&
    withoutLanguage(e.from.pathname) === withoutLanguage(e.to.pathname)
  ) {
    const section = [
      ...document.querySelectorAll<HTMLElement>(
        "main section[id], main > [id]",
      ),
    ]
      .filter((s) => s.getBoundingClientRect().top < innerHeight * 0.4)
      .at(-1);
    restore = {
      y: scrollY,
      section: section?.id || "",
      offset: section?.getBoundingClientRect().top || 0,
      values: [
        ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          "select[id], input[name]",
        ),
      ].map((el) => [
        el.id ? "#" + el.id : 'input[name="' + el.name + '"]',
        el.value,
      ]),
      buttons: [],
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
          restore!.buttons.push([attr, b.getAttribute(attr) || "", "true"]),
        );
  }
});
document.addEventListener("astro:before-swap", (event) => {
  const e = event as TransitionBeforeSwapEvent;
  e.newDocument.documentElement.dataset.theme =
    document.documentElement.dataset.theme;
  e.newDocument.documentElement.dataset.softnav = "true";
});
document.addEventListener("astro:page-load", () => {
  setTheme();
  syncLinks();
  const state = restore;
  restore = undefined;
  if (state)
    requestAnimationFrame(() => {
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
      requestAnimationFrame(() => {
        const section = document.getElementById(state.section);
        window.scrollTo({
          top: section
            ? section.getBoundingClientRect().top + scrollY - state.offset
            : state.y,
          behavior: "instant",
        });
      });
    });
});
