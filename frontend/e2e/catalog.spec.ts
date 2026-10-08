import { test, expect, type Page } from "@playwright/test";

const artists = [
  {
    id: 1,
    name: "Frayz The Raw",
    bio: "Звук улиц. Музыка без фильтров.",
    avatarUrl: "/test/artist.svg",
  },
  { id: 2, name: "Leftover", bio: "Независимый грув.", avatarUrl: "" },
];
const albums = [
  {
    id: 10,
    title: "Golden Hour",
    artistId: 1,
    artist: artists[0].name,
    year: 2026,
    releaseDate: "2026-09-01",
    tracksQuantity: 2,
    coverUrl: "/test/cover.svg",
  },
];
const tracks = [
  {
    id: 1,
    title: "Simon Said",
    artistId: 1,
    albumId: 10,
    producer: artists[0].name,
    audioUrl: "/test/1.wav",
    coverUrl: "/test/cover.svg",
  },
  {
    id: 2,
    title: "After Hours",
    artistId: 1,
    albumId: 10,
    producer: artists[0].name,
    audioUrl: "/test/2.wav",
    coverUrl: "/test/cover.svg",
  },
  {
    id: 3,
    title: "Woah",
    artistId: 2,
    albumId: null,
    producer: artists[1].name,
    audioUrl: "/test/3.wav",
    coverUrl: "",
  },
];

function audioFixture() {
  const sampleRate = 8000;
  const count = sampleRate * 12;
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index++)
    buffer.writeInt16LE(
      Math.round(
        Math.sin(index * 0.35) *
          (0.25 + Math.abs(Math.sin(index / 3000)) * 0.7) *
          16000,
      ),
      44 + index * 2,
    );
  return buffer;
}

async function mockCatalog(page: Page, empty = false) {
  await page.route("**/api/artists", (route) =>
    route.fulfill({ json: empty ? [] : artists }),
  );
  await page.route("**/api/albums", (route) =>
    route.fulfill({ json: empty ? [] : albums }),
  );
  await page.route("**/api/beats", (route) =>
    route.fulfill({ json: empty ? [] : tracks }),
  );
  await page.route("**/test/*.wav", (route) => {
    const body = audioFixture();
    const match = route
      .request()
      .headers()
      .range?.match(/bytes=(\d+)-(\d*)/);
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2]
      ? Math.min(Number(match[2]), body.length - 1)
      : body.length - 1;
    return route.fulfill({
      status: match ? 206 : 200,
      contentType: "audio/wav",
      headers: {
        "Accept-Ranges": "bytes",
        ...(match
          ? { "Content-Range": `bytes ${start}-${end}/${body.length}` }
          : {}),
      },
      body: body.subarray(start, end + 1),
    });
  });
  await page.route("**/test/*.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#ff531f"/><path d="M0 300 250 0H400L150 400H0" fill="#171717"/><text x="22" y="355" fill="#ffce00" font-size="48" font-family="sans-serif">RAW / 026</text></svg>',
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 204 }));
  await mockCatalog(page);
});

test("waveforms show pulsing skeletons until the real audio is decoded", async ({ page }, testInfo) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/test/*.wav", async (route) => {
    await ready;
    await route.fulfill({ contentType: "audio/wav", body: audioFixture() });
  });
  await page.goto("/beats", { waitUntil: "domcontentloaded" });
  const skeleton = page.locator(".track-row .wave-skeleton").first();
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveCSS("animation-name", "wave-pulse");
  await expect(page.getByText("Загрузка волны…", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("wave-skeleton.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(skeleton).toHaveCSS("animation-name", "none");
  release();
  await expect(page.locator(".track-row .waveform").first()).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".player-wave .waveform")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".wave-skeleton")).toHaveCount(0);
});

test("anonymous likes synchronize across the list, player and track page and survive reload", async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  const voters = new Set<string>();
  let requests = 0;
  let release = () => {};
  const ready = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/beats", (route) => route.fulfill({
    json: tracks.map((track) => ({ ...track, likes: track.id === 1 ? voters.size : 0 })),
  }));
  await page.route("**/api/beats/1/like", async (route) => {
    requests++;
    const body = route.request().postDataJSON();
    expect(route.request().method()).toBe("PUT");
    expect(body.visitorId).toMatch(/^[\da-f-]{36}$/);
    await ready;
    if (body.liked) voters.add(body.visitorId);
    else voters.delete(body.visitorId);
    await route.fulfill({ json: { likes: voters.size, liked: body.liked } });
  });
  await page.goto("/beats");
  const listButton = page.locator(".track-row").first().locator(".like-button");
  const playerButton = page.locator(".player-track .like-button");
  await listButton.click();
  await expect(listButton).toBeDisabled();
  await expect(playerButton).toBeDisabled();
  release();
  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(playerButton).toHaveAttribute("aria-pressed", "true");
  await expect(listButton.locator(".like-count")).toHaveText("1");
  expect(requests).toBe(1);
  await page.locator(".track-title").first().click();
  await expect(page.locator(".entity-actions .like-button")).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".entity-actions .like-button")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".entity-actions .like-count")).toHaveText("1");
  await playerButton.click();
  await expect(page.locator(".entity-actions .like-button")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".entity-actions .like-count")).toHaveText("0");
  expect(voters.size).toBe(0);
  expect(requests).toBe(2);
});

test("failed likes keep their previous state and can be retried", async ({ page }) => {
  let failed = true;
  await page.route("**/api/beats/1/like", (route) => route.fulfill(failed ? {
    status: 503, json: { detail: "Unavailable" },
  } : { json: { liked: true, likes: 1 } }));
  await page.goto("/beats");
  const button = page.locator(".track-row").first().locator(".like-button");
  await button.click();
  await expect(page.locator(".track-row .like-error")).toBeVisible();
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await expect(button.locator(".like-count")).toHaveText("0");
  failed = false;
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await expect(button.locator(".like-count")).toHaveText("1");
  await expect(page.locator(".like-error")).toHaveCount(0);
});

for (const [random, title] of [[0, "Simon Said"], [0.99, "Woah"]] as const) {
  test(`initial selection uses random catalog position ${random} without autoplay`, async ({ page }) => {
    await page.addInitScript((value) => { Math.random = () => value; }, random);
    await page.goto("/about");
    await expect(page.locator(".player-titles > a")).toHaveText(title);
    await expect(page.locator(".player-shell > audio")).toHaveJSProperty("paused", true);
    await expect(page.locator('.player-wave input')).toHaveCount(0);
    const waveform = page.locator('.player-wave [role="slider"]');
    await expect(page.locator(".player-wave .waveform")).toHaveAttribute("aria-busy", "false");
    await waveform.press("ArrowRight");
    await expect.poll(() => page.locator(".player-shell > audio").evaluate(
      (audio: HTMLAudioElement) => audio.currentTime,
    )).toBeGreaterThan(4);
    await expect(page.locator(".player-shell > audio")).toHaveJSProperty("paused", true);
    await page.getByRole("button", { name: "Очередь воспроизведения" }).click();
    await expect(page.locator(".queue-panel ol li")).toHaveCount(3);
    await expect(page.locator(".queue-panel h2, .queue-panel > p")).toHaveCount(0);
    await page.getByRole("button", { name: "Закрыть очередь" }).click();
    await expect(page.getByRole("button", { name: "Очередь воспроизведения" })).toBeFocused();
  });
}

test("album cover overrides track artwork and singles use layered MARS titles", async ({ page }) => {
  await page.route("**/api/beats", (route) => route.fulfill({
    json: tracks.map((track) => track.id === 1 ? { ...track, coverUrl: "/test/own.svg" } : track),
  }));
  await page.goto("/beats");
  await expect(page.locator(".track-row").first().locator(".track-art img")).toHaveAttribute("src", albums[0].coverUrl);
  const fallback = page.locator(".track-row").last().locator(".artwork-fallback");
  await expect(fallback).toHaveAttribute("aria-label", "Woah");
  await expect(fallback.locator(".artwork-type > span")).toHaveText(["Woah", "Woah", "Woah"]);
  await expect(fallback.locator(".artwork-type")).toHaveCSS("font-family", 'MARS, Impact, sans-serif');
  await page.locator(".track-title").first().click();
  await expect(page.locator("img.entity-art")).toHaveAttribute("src", albums[0].coverUrl);
});

test("artists show full biographies without search and active navigation stays transparent", async ({ page }) => {
  await page.goto("/artists?q=absent");
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.locator(".crew-card")).toHaveCount(artists.length);
  await expect(page.locator(".crew-copy p").first()).toHaveText(artists[0].bio);
  await expect(page.locator('.desktop-nav a.active')).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const height = await page.locator(".page-heading").evaluate((node) => node.getBoundingClientRect().height);
  expect(height).toBeLessThan(130);
});

test("five artists with long biographies fit without overlapping posters", async ({ page }, testInfo) => {
  const crew = [...artists, ...Array.from({ length: 3 }, (_, index) => ({
    id: index + 3,
    name: ["Northern Sound", "Raw Voice", "Siberian Selector"][index],
    bio: "Делаем биты, читаем рэп и записываем миксы. ".repeat(index === 0 ? 12 : 3),
    avatarUrl: index === 1 ? "/test/artist.svg" : "",
  }))];
  await page.route("**/api/artists", (route) => route.fulfill({ json: crew }));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/artists");
    await expect(page.locator(".crew-card")).toHaveCount(5);
    await expect(page.locator(".crew-copy p").nth(2)).toHaveText(crew[2].bio);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await page.locator(".crew-card").evaluateAll((nodes) => nodes.map((node) => {
      const { left, right, top, bottom } = node.getBoundingClientRect();
      return { left, right, top, bottom };
    }));
    for (let index = 0; index < bounds.length; index++) {
      for (const other of bounds.slice(index + 1)) {
        const card = bounds[index];
        expect(card.right <= other.left || other.right <= card.left || card.bottom <= other.top || other.bottom <= card.top).toBe(true);
      }
    }
    if (width === 1440) {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: testInfo.outputPath("crew-five-1440.png"), fullPage: true });
    }
  }
});

test("track, artist and album links preserve playback and waveform seeking", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/beats");
  await expect(page.locator(".track-row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Слушать: Simon Said", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator(".player-shell > audio")
        .evaluate(
          (audio: HTMLAudioElement) => !audio.paused && audio.currentTime > 0,
        ),
    )
    .toBe(true);
  await page
    .locator(".track-row")
    .first()
    .getByRole("link", { name: "Frayz The Raw", exact: true })
    .click();
  await expect(page).toHaveURL(/\/artists\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Frayz The Raw",
  );
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.locator(".player-shell > audio")).toHaveJSProperty(
    "paused",
    false,
  );
  await page.locator(".card-title").click();
  await expect(page).toHaveURL(/\/albums\/10$/);
  await expect(page.locator(".track-row")).toHaveCount(2);
  await page.locator(".track-title").first().click();
  await expect(page).toHaveURL(/\/beats\/1$/);
  await expect(page.locator(".entity-copy .waveform")).toHaveAttribute("aria-busy", "false");
  await page.locator(".entity-copy .waveform").press("Home");
  await page.locator(".entity-copy .waveform").press("ArrowRight");
  await expect
    .poll(() =>
      page
        .locator(".player-shell > audio")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(4);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(page.locator(".player-shell > audio")).toHaveJSProperty(
    "paused",
    true,
  );
  await page
    .getByRole("button", { name: "Воспроизвести", exact: true })
    .click();
  await expect(page.locator(".player-shell > audio")).toHaveJSProperty(
    "paused",
    false,
  );
  expect(errors).toEqual([]);
});

test("queue advances, falls back to a different random track, and restores history", async ({
  page,
}) => {
  await page.goto("/albums/10");
  await page.getByRole("button", { name: "Слушать альбом" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("Simon Said");
  await page.getByRole("button", { name: "Следующий трек" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("After Hours");
  await page.getByRole("button", { name: "Следующий трек" }).click();
  await expect(page.locator(".player-titles > a")).not.toHaveText(
    "After Hours",
  );
  await page.getByRole("button", { name: "Предыдущий трек" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("After Hours");
  await page.getByRole("button", { name: "Предыдущий трек" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("Simon Said");
  await page.getByRole("button", { name: "Следующий трек" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("After Hours");
  await expect
    .poll(() =>
      page
        .locator(".player-shell > audio")
        .evaluate(
          (audio: HTMLAudioElement) =>
            audio.currentSrc.endsWith("/test/2.wav") &&
            !audio.paused &&
            audio.currentTime > 0,
        ),
    )
    .toBe(true);
  await expect(page.locator(".player-shell > audio")).toHaveJSProperty(
    "readyState",
    4,
  );
  await page
    .locator(".player-shell > audio")
    .evaluate((audio: HTMLAudioElement) => {
      audio.currentTime = audio.duration - 0.15;
    });
  await expect(page.locator(".player-titles > a")).not.toHaveText(
    "After Hours",
  );
  await page.getByRole("button", { name: "Очередь воспроизведения" }).click();
  await expect(
    page.getByRole("region", { name: "Очередь воспроизведения" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("region", { name: "Очередь воспроизведения" }),
  ).toHaveCount(0);
});

test("search is addressable, singles omit album links, missing entities show recovery", async ({
  page,
}) => {
  await page.goto("/beats?q=Golden");
  await expect(page.locator(".track-row")).toHaveCount(2);
  await page.getByRole("searchbox").fill("Woah");
  await expect(page.locator(".track-row")).toHaveCount(1);
  await expect(page).toHaveURL(/q=Woah/);
  await page.locator(".track-title").click();
  await expect(page.locator(".entity-relations")).toContainText(
    "Сингл / без альбома",
  );
  await expect(
    page.locator('.entity-relations a[href^="/albums/"]'),
  ).toHaveCount(0);
  await page.goto("/albums/999");
  await expect(
    page.getByRole("heading", { name: "Запись не найдена" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Вернуться в каталог" }).click();
  await expect(page).toHaveURL(/\/albums$/);
});

test("a catalog with one track repeats after finishing", async ({ page }) => {
  await page.route("**/api/beats", (route) =>
    route.fulfill({ json: [tracks[2]] }),
  );
  await page.goto("/beats");
  await page
    .getByRole("button", { name: "Слушать: Woah", exact: true })
    .click();
  const audio = page.locator(".player-shell > audio");
  await expect
    .poll(() =>
      audio.evaluate(
        (element: HTMLAudioElement) =>
          element.currentTime > 0 && !element.paused,
      ),
    )
    .toBe(true);
  await audio.evaluate((element: HTMLAudioElement) => {
    element.currentTime = element.duration - 0.15;
  });
  await expect
    .poll(() =>
      audio.evaluate(
        (element: HTMLAudioElement) =>
          element.currentTime < 2 && !element.paused,
      ),
    )
    .toBe(true);
  await expect(page.locator(".player-titles > a")).toHaveText("Woah");
});

test("empty catalog disables playback", async ({ page }) => {
  await mockCatalog(page, true);
  await page.goto("/beats");
  await expect(
    page.getByRole("button", { name: "Слушать всё" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Воспроизвести", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".empty-state")).toContainText(
    "Треки появятся здесь",
  );
});

test("audio failures remain recoverable", async ({ page }) => {
  await page.route("**/test/1.wav", (route) => route.fulfill({ status: 404 }));
  await page.goto("/beats");
  await page
    .getByRole("button", { name: "Слушать: Simon Said", exact: true })
    .click();
  await expect(page.locator(".player-error")).toBeVisible();
  await page.getByRole("button", { name: "Следующий трек" }).click();
  await expect(page.locator(".player-titles > a")).toHaveText("After Hours");
  await expect(page.locator(".player-error")).toHaveCount(0);
  await expect(page.locator(".player-shell > audio")).toHaveJSProperty(
    "paused",
    false,
  );
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive navigation and layouts at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/beats",
      "/artists",
      "/albums",
      "/artists/1",
      "/albums/10",
      "/beats/1",
      "/about",
    ]) {
      await page.goto(route);
      await expect(page.locator(".feedback")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
      if (width <= 760 && route === "/beats") {
        const shell = await page.locator(".player-shell").boundingBox();
        const controls = await page.locator(".player-controls").boundingBox();
        const titles = await page.locator(".player-titles").boundingBox();
        const like = await page.locator(".player-track .like-button").boundingBox();
        const queue = await page.locator(".queue-toggle").boundingBox();
        const progress = await page.locator(".player-progress").boundingBox();
        expect(controls).not.toBeNull();
        expect(titles).not.toBeNull();
        expect(like).not.toBeNull();
        expect(queue).not.toBeNull();
        expect(progress).not.toBeNull();
        expect(Math.abs(controls!.x + controls!.width / 2 - (shell!.x + shell!.width / 2))).toBeLessThanOrEqual(1);
        expect(titles!.x + titles!.width).toBeLessThanOrEqual(controls!.x);
        expect(queue!.x).toBeGreaterThanOrEqual(controls!.x + controls!.width);
        expect(like!.x).toBeGreaterThanOrEqual(queue!.x + queue!.width);
        expect(progress!.y).toBeGreaterThanOrEqual(controls!.y + controls!.height);
        await page.locator(".queue-toggle").click();
        await expect(page.locator(".queue-panel")).toBeVisible();
        await page.locator(".queue-close").click();
        await expect(page.locator(".queue-panel")).toHaveCount(0);
      }
      if ([390, 1440].includes(width) && ["/artists", "/about", "/beats"].includes(route)) {
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${width}.png`), fullPage: true });
      }
    }
    if (width < 760) {
      await page.getByRole("button", { name: "Открыть меню" }).click();
      await page
        .locator(".mobile-nav")
        .getByRole("link", { name: "Артисты" })
        .click();
      await expect(page).toHaveURL(/\/artists$/);
      await expect(page.locator(".mobile-nav")).toHaveCount(0);
    }
  });
}
