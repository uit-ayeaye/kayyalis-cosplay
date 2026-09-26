/** Decode before replacing: the previous photograph stays visible on slow connections. */
export function createGallery(stage: HTMLElement, signal: AbortSignal) {
  let request = 0;
  const cache = new Map<string, Promise<HTMLImageElement>>();
  const constrained = () =>
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData;
  function load(src: string) {
    let entry = cache.get(src);
    if (!entry) {
      const image = new Image();
      image.decoding = "async";
      image.src = src;
      entry = image
        .decode()
        .then(() => image)
        .catch((error) => {
          cache.delete(src);
          throw error;
        });
      cache.set(src, entry);
      if (cache.size > 6) cache.delete(cache.keys().next().value!);
    }
    return entry;
  }
  function warm(urls: string[]) {
    if (!constrained() && !signal.aborted)
      urls.slice(0, 2).forEach((src) => void load(src).catch(() => {}));
  }
  async function show(
    src: string,
    alt: string,
    nearby: string[] = [],
    placeholder?: string,
  ) {
    const id = ++request;
    stage.setAttribute("aria-busy", "true");
    stage.querySelector(".gallery-error")?.remove();
    if (!stage.querySelector("img") && placeholder) {
      const thumb = new Image();
      thumb.src = placeholder;
      thumb.alt = alt;
      thumb.className = "gallery-placeholder";
      stage.append(thumb);
    }
    try {
      const decoded = await load(src);
      if (id !== request || signal.aborted) return false;
      const image = decoded.cloneNode() as HTMLImageElement;
      image.alt = alt;
      image.className = "gallery-frame";
      const old = [...stage.querySelectorAll("img")];
      stage.append(image);
      stage.setAttribute("aria-busy", "false");
      const motion = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (motion && old.length) {
        const animation = image.animate(
          [
            { opacity: 0, translate: "5px 0" },
            { opacity: 1, translate: "0 0" },
          ],
          { duration: 150, easing: "ease-out" },
        );
        void animation.finished
          .catch(() => {})
          .then(() => old.forEach((node) => node.remove()));
      } else old.forEach((node) => node.remove());
      warm(nearby);
      return true;
    } catch {
      if (id !== request || signal.aborted) return false;
      stage.setAttribute("aria-busy", "false");
      const note = document.createElement("p");
      note.className = "gallery-error";
      note.setAttribute("role", "status");
      note.textContent =
        document.documentElement.lang === "th"
          ? "โหลดภาพไม่ได้ ลองอีกภาพหรือเปิดโพสต์ต้นฉบับ"
          : "Photo could not load. Try another photo or the original source.";
      stage.append(note);
      return false;
    }
  }
  function reset() {
    request++;
    stage.setAttribute("aria-busy", "false");
    stage.replaceChildren();
  }
  signal.addEventListener(
    "abort",
    () => {
      request++;
      cache.clear();
    },
    { once: true },
  );
  return { show, warm, reset };
}
