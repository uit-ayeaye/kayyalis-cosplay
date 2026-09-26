import { initReveals } from "./reveals";
import { createGallery } from "./gallery";
import { initPreviews } from "./previews";
import type { photos, clips, characters } from "../data/cosplay";
let activeBody: HTMLElement | undefined;
let teardown: (() => void) | undefined;
function initializePage() {
  if (activeBody === document.body) return;
  activeBody = document.body;
  teardown?.();
  if (!document.querySelector("#cos-media-data")) return;
  const controller = new AbortController();
  const { signal } = controller;
  const data = JSON.parse(
    document.querySelector("#cos-media-data")!.textContent!,
  ) as {
    photos: typeof photos;
    clips: typeof clips;
    characters: Pick<(typeof characters)[number], "id" | "name" | "series">[];
    base: string;
  };
  const th = document.documentElement.lang === "th";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const previews = initPreviews(signal);
  const menu = document.querySelector<HTMLDialogElement>("#cos-menu")!;
  const trigger = document.querySelector<HTMLButtonElement>(".menu-trigger")!;
  const media = document.querySelector<HTMLDialogElement>("#cos-media")!;
  const stage = media.querySelector<HTMLDivElement>(".media-stage")!;
  let closing = false;
  function closeDialog(dialog: HTMLDialogElement) {
    if (closing || !dialog.open) return;
    closing = true;
    stage.querySelector("video")?.pause();
    const finish = () => {
      dialog.close();
      dialog.classList.remove("closing");
      closing = false;
      previews.resume();
    };
    if (reduced.matches) finish();
    else {
      dialog.classList.add("closing");
      window.setTimeout(finish, 220);
    }
  }
  trigger.addEventListener(
    "click",
    () => {
      menu.showModal();
      trigger.setAttribute("aria-expanded", "true");
      previews.suspend();
    },
    { signal },
  );
  menu
    .querySelector("[data-close]")!
    .addEventListener("click", () => closeDialog(menu), { signal });
  menu.addEventListener(
    "close",
    () => trigger.setAttribute("aria-expanded", "false"),
    { signal },
  );
  menu
    .querySelectorAll("a")
    .forEach((a) =>
      a.addEventListener("click", () => closeDialog(menu), { signal }),
    );
  [menu, media].forEach((dialog) => {
    dialog.addEventListener(
      "cancel",
      (event) => {
        event.preventDefault();
        closeDialog(dialog);
      },
      { signal },
    );
    dialog.addEventListener(
      "click",
      (event) => {
        const r = dialog.getBoundingClientRect();
        if (
          event.target === dialog &&
          (event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom)
        )
          closeDialog(dialog);
      },
      { signal },
    );
  });
  let filter = "all";
  let character = "all";
  let limit = 12;
  const photoButtons = [
    ...document.querySelectorAll<HTMLButtonElement>(".diary-photo"),
  ];
  const more = document.querySelector<HTMLButtonElement>(".load-more")!;
  const status =
    document.querySelector<HTMLParagraphElement>(".gallery-status")!;
  function matched() {
    return photoButtons.filter(
      (b) =>
        (filter === "all" || b.dataset.category === filter) &&
        (character === "all" || b.dataset.character === character),
    );
  }
  function applyFilter() {
    const matches = matched();
    photoButtons.forEach(
      (b) => (b.hidden = !matches.includes(b) || matches.indexOf(b) >= limit),
    );
    more.hidden = matches.length <= limit;
    status.textContent = th
      ? `แสดง ${Math.min(limit, matches.length)} จาก ${matches.length} ภาพ`
      : `Showing ${Math.min(limit, matches.length)} of ${matches.length} images`;
  }
  document.querySelectorAll<HTMLButtonElement>("[data-filter]").forEach((b) =>
    b.addEventListener(
      "click",
      () => {
        filter = b.dataset.filter!;
        limit = 12;
        document
          .querySelectorAll("[data-filter]")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        applyFilter();
      },
      { signal },
    ),
  );
  document
    .querySelector<HTMLSelectElement>("#character-filter")
    ?.addEventListener(
      "change",
      (event) => {
        character = (event.target as HTMLSelectElement).value;
        limit = 12;
        applyFilter();
      },
      { signal },
    );
  more.addEventListener(
    "click",
    () => {
      const next = matched()[limit];
      limit += 12;
      applyFilter();
      next?.focus({ preventScroll: true });
    },
    { signal },
  );
  applyFilter();
  let mode: "photo" | "clip" = "photo";
  let queue: string[] = [];
  let index = 0;
  const title = document.querySelector<HTMLElement>("#media-title")!;
  const detail = document.querySelector<HTMLElement>("#media-detail")!;
  const credit = document.querySelector<HTMLElement>("#media-credit")!;
  const source = document.querySelector<HTMLAnchorElement>("#media-source")!;
  const counter = document.querySelector<HTMLElement>("#media-counter")!;
  const prev = media.querySelector<HTMLButtonElement>("[data-prev]")!;
  const next = media.querySelector<HTMLButtonElement>("[data-next]")!;
  const gallery = createGallery(stage, signal);
  async function render() {
    const old = stage.querySelector("video");
    if (old) {
      old.pause();
      old.removeAttribute("src");
      old.load();
    }
    if (mode === "clip") gallery.reset();
    counter.textContent = `${String(index + 1).padStart(2, "0")} / ${String(queue.length).padStart(2, "0")} · ${mode === "photo" ? (th ? "ภาพถ่าย" : "PHOTO DIARY") : th ? "วิดีโอ" : "IN MOTION"}`;
    prev.disabled = queue.length < 2;
    next.disabled = queue.length < 2;
    if (mode === "photo") {
      const p = data.photos.find((p) => p.id === queue[index])!;
      const nearby = [-1, 1].map(
        (delta) =>
          `${data.base}/cosplay/photos/${queue[(index + delta + queue.length) % queue.length]}.webp`,
      );
      if (
        !(await gallery.show(
          `${data.base}/cosplay/photos/${p.id}.webp`,
          p.alt,
          nearby,
          `${data.base}/cosplay/photos/${p.id}-small.webp`,
        ))
      )
        return;
      title.textContent = p.name;
      detail.textContent = p.series;
      credit.textContent = p.credit
        ? `${th ? "ภาพโดย" : "Photography"}: ${p.credit}`
        : "Kayyalis · @kayyalis.cos";
      source.href = p.source;
    } else {
      const v = data.clips.find((v) => v.id === queue[index])!;
      const c = data.characters.find((c) => c.id === v.character)!;
      const video = document.createElement("video");
      video.src = `${data.base}/cosplay/videos/${v.id}.mp4`;
      video.poster = `${data.base}/cosplay/videos/${v.id}.jpg`;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("aria-label", `${c.name} cosplay video`);
      stage.append(video);
      title.textContent = c.name;
      detail.textContent = `${c.series} · ${v.platform} · ${Math.round(v.duration)}s`;
      credit.textContent = `@${v.platform === "Instagram" ? "kayyalis.cos" : "keewadun"} · ${v.width} × ${v.height}`;
      source.href = v.source;
      video.play().catch(() => {
        /* Native controls remain available if autoplay is restricted. */
      });
      video.addEventListener(
        "error",
        () => {
          const p = document.createElement("p");
          p.className = "media-error";
          p.textContent = th
            ? "โหลดคลิปไม่ได้ ลองชมจากโพสต์ต้นฉบับด้านล่าง"
            : "This clip could not load. You can still watch the original post below.";
          stage.append(p);
        },
        { signal, once: true },
      );
    }
  }
  function openPhoto(id: string, ids?: string[]) {
    mode = "photo";
    queue = ids?.length ? ids : matched().map((b) => b.dataset.photo!);
    if (!queue.includes(id))
      queue = data.photos
        .filter(
          (p) =>
            p.character === data.photos.find((p) => p.id === id)?.character,
        )
        .map((p) => p.id);
    index = Math.max(0, queue.indexOf(id));
    previews.suspend();
    render();
    media.showModal();
  }
  document
    .querySelectorAll<HTMLButtonElement>(".photo-open")
    .forEach((button) =>
      button.addEventListener("click", () => openPhoto(button.dataset.photo!), {
        signal,
      }),
    );
  document.querySelector("[data-surprise]")?.addEventListener(
    "click",
    () => {
      const ids = matched().map((b) => b.dataset.photo!);
      if (ids.length)
        openPhoto(ids[Math.floor(Math.random() * ids.length)], ids);
    },
    { signal },
  );
  const clipButtons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-clip]"),
  ];
  clipButtons.forEach((button) =>
    button.addEventListener(
      "click",
      () => {
        mode = "clip";
        queue = clipButtons
          .filter((b) => !b.hidden)
          .map((b) => b.dataset.clip!);
        index = queue.indexOf(button.dataset.clip!);
        previews.suspend();
        render();
        media.showModal();
      },
      { signal },
    ),
  );
  function move(delta: number) {
    index = (index + delta + queue.length) % queue.length;
    render();
  }
  prev.addEventListener("click", () => move(-1), { signal });
  next.addEventListener("click", () => move(1), { signal });
  media
    .querySelector("[data-media-close]")!
    .addEventListener("click", () => closeDialog(media), { signal });
  media.addEventListener(
    "close",
    () => {
      stage.querySelector("video")?.pause();
      stage.replaceChildren();
      previews.resume();
    },
    { signal },
  );
  media.addEventListener(
    "keydown",
    (event) => {
      if (event.target instanceof HTMLVideoElement) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
    },
    { signal },
  );
  let touchStart = 0;
  stage.addEventListener(
    "touchstart",
    (event) => {
      touchStart = event.changedTouches[0].clientX;
    },
    { signal, passive: true },
  );
  stage.addEventListener(
    "touchend",
    (event) => {
      if (mode === "photo") {
        const d = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(d) > 65) move(d > 0 ? -1 : 1);
      }
    },
    { signal, passive: true },
  );
  initReveals(".reveal", signal);
  const progress = document.querySelector<HTMLElement>(".scroll-progress")!;
  let ticking = false;
  function updateProgress() {
    const height = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${height > 0 ? scrollY / height : 0})`;
    ticking = false;
  }
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateProgress);
      }
    },
    { signal, passive: true },
  );
  addEventListener("resize", updateProgress, { signal });
  updateProgress();

  // A complete library and a touch-native filmstrip share one set of video cards.
  const filmTrackElement = document.querySelector<HTMLElement>(".reel-track");
  if (filmTrackElement) {
    const filmTrack = filmTrackElement;
    const cards = [
      ...filmTrack.querySelectorAll<HTMLButtonElement>("[data-clip]"),
    ];
    let platform = cards.some((c) => c.dataset.filmPlatformName === "TikTok")
      ? "TikTok"
      : "Instagram";
    let filmCharacter = "all";
    let grid = false;
    const filmStatus =
      document.querySelector<HTMLElement>("[data-film-status]")!;
    const view = document.querySelector<HTMLButtonElement>("[data-film-view]")!;
    const previous =
      document.querySelector<HTMLButtonElement>("[data-film-prev]")!;
    const following =
      document.querySelector<HTMLButtonElement>("[data-film-next]")!;
    const empty = document.createElement("p");
    empty.className = "cinema-empty";
    empty.hidden = true;
    empty.textContent = th
      ? "ไม่มีคลิปในตัวเลือกนี้ ลองเลือกทั้งหมดหรือเปลี่ยนตัวละคร"
      : "No clips in this selection. Choose All or try another character.";
    filmTrack.after(empty);
    const visible = () => cards.filter((c) => !c.hidden);
    function edges() {
      previous.disabled = grid || filmTrack!.scrollLeft <= 2;
      following.disabled =
        grid ||
        filmTrack!.scrollLeft >=
          filmTrack!.scrollWidth - filmTrack!.clientWidth - 2;
    }
    function filterFilms() {
      cards.forEach(
        (c) =>
          (c.hidden = !(
            (platform === "all" || c.dataset.filmPlatformName === platform) &&
            (filmCharacter === "all" ||
              c.dataset.filmCharacter === filmCharacter)
          )),
      );
      const count = visible().length;
      filmStatus.textContent = th
        ? `${count} คลิป · แตะเพื่อชมคลิปเต็ม`
        : `${count} ${count === 1 ? "film" : "films"} · tap for the full moment`;
      document
        .querySelectorAll<HTMLButtonElement>("[data-film-platform]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.filmPlatform === platform),
          ),
        );
      filmTrack!.scrollLeft = 0;
      empty.hidden = count > 0;
      previews.refresh();
      requestAnimationFrame(edges);
    }
    document
      .querySelectorAll<HTMLButtonElement>("[data-film-platform]")
      .forEach((b) =>
        b.addEventListener(
          "click",
          () => {
            platform = b.dataset.filmPlatform!;
            filterFilms();
          },
          { signal },
        ),
      );
    document
      .querySelector<HTMLSelectElement>("#film-character")
      ?.addEventListener(
        "change",
        (event) => {
          filmCharacter = (event.target as HTMLSelectElement).value;
          filterFilms();
        },
        { signal },
      );
    view.addEventListener(
      "click",
      () => {
        grid = !grid;
        filmTrack.classList.toggle("film-grid", grid);
        view.setAttribute("aria-pressed", String(grid));
        view.textContent = grid
          ? th
            ? "↔ กลับไปเลื่อนฟิล์ม"
            : "↔ Back to filmstrip"
          : th
            ? "▦ ดูทั้งหมด"
            : "▦ Browse all";
        requestAnimationFrame(() => {
          edges();
          previews.refresh();
        });
      },
      { signal },
    );
    function scrollFilms(direction: number) {
      filmTrack!.scrollBy({
        left: direction * filmTrack!.clientWidth * 0.82,
        behavior: reduced.matches ? "instant" : "smooth",
      });
    }
    previous.addEventListener("click", () => scrollFilms(-1), { signal });
    following.addEventListener("click", () => scrollFilms(1), { signal });
    filmTrack.addEventListener("scroll", edges, { signal, passive: true });
    addEventListener("resize", edges, { signal });
    // Mouse dragging gets gentle inertia; phones keep their native touch scrolling.
    let down = false,
      dragging = false,
      startX = 0,
      lastX = 0,
      lastTime = 0,
      velocity = 0,
      suppressClick = false,
      frame = 0;
    const settle = () => {
      filmTrack.classList.remove("dragging");
      dragging = false;
      previews.resume();
      edges();
    };
    filmTrack.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType !== "mouse" || event.button !== 0 || grid) return;
        cancelAnimationFrame(frame);
        down = true;
        dragging = false;
        startX = lastX = event.clientX;
        lastTime = performance.now();
        velocity = 0;
      },
      { signal },
    );
    filmTrack.addEventListener(
      "pointermove",
      (event) => {
        if (!down) return;
        const now = performance.now();
        const dx = event.clientX - lastX;
        if (!dragging && Math.abs(event.clientX - startX) > 7) {
          dragging = true;
          filmTrack.setPointerCapture(event.pointerId);
          filmTrack.classList.add("dragging");
          previews.suspend();
        }
        if (dragging) {
          event.preventDefault();
          filmTrack.scrollLeft -= dx;
          velocity = -dx / Math.max(8, now - lastTime);
        }
        lastX = event.clientX;
        lastTime = now;
      },
      { signal },
    );
    function release() {
      if (!down) return;
      down = false;
      if (!dragging) return;
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 200);
      if (reduced.matches || Math.abs(velocity) < 0.1) {
        settle();
        return;
      }
      let last = performance.now();
      const glide = (now: number) => {
        const dt = Math.min(32, now - last);
        last = now;
        const before = filmTrack.scrollLeft;
        filmTrack.scrollLeft += velocity * dt;
        velocity *= Math.pow(0.9, dt / 16);
        if (Math.abs(velocity) < 0.05 || before === filmTrack.scrollLeft) {
          settle();
          return;
        }
        frame = requestAnimationFrame(glide);
      };
      frame = requestAnimationFrame(glide);
    }
    filmTrack.addEventListener("pointerup", release, { signal });
    filmTrack.addEventListener(
      "pointercancel",
      () => {
        down = false;
        cancelAnimationFrame(frame);
        settle();
      },
      { signal },
    );
    filmTrack.addEventListener(
      "pointerleave",
      () => {
        if (!dragging) down = false;
      },
      { signal },
    );
    filmTrack.addEventListener(
      "click",
      (event) => {
        if (suppressClick) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    filterFilms();
  }
  const chapterLinks = [
    ...document.querySelectorAll<HTMLAnchorElement>("[data-chapter]"),
  ];
  function markChapter() {
    const y = scrollY + innerHeight * 0.4;
    let active = chapterLinks[0];
    for (const a of chapterLinks) {
      const section = document.getElementById(a.dataset.chapter!);
      if (section && section.getBoundingClientRect().top + scrollY <= y)
        active = a;
    }
    chapterLinks.forEach((a) => {
      if (a === active) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }
  let chapterFrame = false;
  addEventListener(
    "scroll",
    () => {
      if (!chapterFrame) {
        chapterFrame = true;
        requestAnimationFrame(() => {
          markChapter();
          chapterFrame = false;
        });
      }
    },
    { signal, passive: true },
  );
  markChapter();

  teardown = () => {
    controller.abort();

    document.querySelectorAll("video").forEach((v) => v.pause());
  };
}
document.addEventListener("astro:page-load", initializePage);
document.addEventListener("portfolio:localize", initializePage);
document.addEventListener("astro:before-swap", () => teardown?.());
