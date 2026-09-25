/** Silent six-second previews. Only two visible cards can play at once. */
export function initPreviews(signal?: AbortSignal) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (
    navigator as Navigator & {
      connection?: EventTarget & { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const constrained = () =>
    Boolean(
      connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ""),
    );
  let paused = false;
  try {
    paused = localStorage.getItem("kayyalis-previews-paused") === "yes";
  } catch {}
  const clips = [
    ...document.querySelectorAll<HTMLVideoElement>("video[data-preview-src]"),
  ];
  const visibility = new Map<HTMLVideoElement, number>();
  const blocked = new Set<HTMLVideoElement>();
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    "[data-preview-toggle]",
  );
  const th = document.documentElement.lang === "th";
  let suspended = false;
  function refresh() {
    if (signal?.aborted) return;
    const restricted = reduced.matches || constrained();
    const enabled = !paused && !restricted;
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(!enabled));
      button.disabled = restricted;
      button.textContent = restricted
        ? th
          ? "ตัวอย่างแบบภาพนิ่ง"
          : "Still previews"
        : paused
          ? th
            ? "เปิดตัวอย่างเคลื่อนไหว"
            : "Play previews"
          : th
            ? "หยุดตัวอย่าง"
            : "Pause previews";
      button.title = restricted
        ? th
          ? "ตามการตั้งค่าลดการเคลื่อนไหวหรือประหยัดข้อมูล"
          : "Following your reduced-motion or data-saving preference"
        : "";
    });
    const candidates =
      enabled &&
      !suspended &&
      !document.hidden &&
      !document.querySelector("dialog[open]")
        ? [...visibility]
            .filter(
              ([v, ratio]) =>
                ratio >= 0.35 &&
                !blocked.has(v) &&
                v.getClientRects().length > 0,
            )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([v]) => v)
        : [];
    clips.forEach((video) => {
      if (candidates.includes(video)) {
        video.muted = true;
        if (!video.getAttribute("src")) video.src = video.dataset.previewSrc!;
        if (video.paused)
          video.play().catch(() => {
            blocked.add(video);
            video.classList.remove("is-playing");
          });
      } else {
        video.pause();
        video.classList.remove("is-playing");
      }
    });
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) =>
        visibility.set(
          entry.target as HTMLVideoElement,
          entry.intersectionRatio,
        ),
      );
      refresh();
    },
    { threshold: [0, 0.35, 0.6, 0.9, 1] },
  );
  clips.forEach((video) => {
    video.addEventListener(
      "playing",
      () => {
        if (
          paused ||
          reduced.matches ||
          constrained() ||
          suspended ||
          document.hidden ||
          document.querySelector("dialog[open]") ||
          (visibility.get(video) || 0) < 0.35
        ) {
          video.pause();
          return;
        }
        video.classList.add("is-playing");
      },
      { signal },
    );
    video.addEventListener(
      "error",
      () => {
        blocked.add(video);
        video.classList.remove("is-playing");
      },
      { signal },
    );
    observer.observe(video);
  });
  buttons.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        paused = !paused;
        blocked.clear();
        try {
          localStorage.setItem(
            "kayyalis-previews-paused",
            paused ? "yes" : "no",
          );
        } catch {}
        refresh();
      },
      { signal },
    ),
  );
  reduced.addEventListener("change", refresh, { signal });
  connection?.addEventListener("change", refresh, { signal });
  document.addEventListener("visibilitychange", refresh, { signal });
  document
    .querySelectorAll("dialog")
    .forEach((dialog) => dialog.addEventListener("close", refresh, { signal }));
  refresh();
  signal?.addEventListener(
    "abort",
    () => {
      observer.disconnect();
      clips.forEach((v) => v.pause());
      visibility.clear();
    },
    { once: true },
  );
  return {
    refresh,
    suspend() {
      suspended = true;
      refresh();
    },
    resume() {
      suspended = false;
      refresh();
    },
  };
}
