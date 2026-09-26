/** Reveal small items once, only when they actually reach the viewport. */
export function initReveals(selector: string, signal: AbortSignal) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const items = [...document.querySelectorAll<HTMLElement>(selector)];
  const translating =
    document.documentElement.hasAttribute("data-language-swap");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        element.classList.remove("reveal-pending");
        if (!reduced.matches && !translating)
          element.animate(
            [
              { opacity: 0.35, translate: "0 14px" },
              { opacity: 1, translate: "0 0" },
            ],
            { duration: 320, easing: "cubic-bezier(.2,.7,.25,1)" },
          );
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );
  for (const item of items) {
    if (
      reduced.matches ||
      translating ||
      item.getBoundingClientRect().top < innerHeight * 0.92
    )
      continue;
    item.classList.add("reveal-pending");
    observer.observe(item);
  }
  const revealAll = () => {
    if (reduced.matches) {
      observer.disconnect();
      items.forEach((e) => e.classList.remove("reveal-pending"));
    }
  };
  reduced.addEventListener("change", revealAll, { signal });
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}
