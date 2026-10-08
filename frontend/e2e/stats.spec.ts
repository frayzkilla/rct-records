import { test, expect, type Page } from "@playwright/test";

const now = "2026-10-09T10:00:00Z";
const startedAt = "2026-10-01T00:00:00Z";
const summary = { visits: 42, views: 138, visitors: 28, plays: 86, adminActions: 12 };
const site = {
  period: "7d", updatedAt: now, startedAt, timezone: "Asia/Irkutsk", summary,
  series: Array.from({ length: 7 }, (_, index) => ({ at: `2026-10-0${index + 3}T00:00:00Z`, visits: index + 3, views: index * 3 + 5, visitors: index + 1, plays: index * 2 + 2, adminActions: index % 3, admins: { "1": index % 3 } })),
  topTracks: [{ id: 1, title: "Siberian Signal", artist: "Raw Crownz", coverUrl: "", plays: 51, deleted: false }, { id: 2, title: "After Hours", artist: "Frayz", coverUrl: "", plays: 24, deleted: true }, { id: 3, title: "Northern Lights", artist: "Leftover", coverUrl: "", plays: 11, deleted: false }],
  admins: [{ id: 1, username: "god-admin", actions: 12, logins: 3, changes: 8, lastAt: now, lastAction: "update:track" }],
};
const server = {
  at: now, scope: "VPS", uptime: 987654, catalogTracks: 32,
  cpu: { percent: 23.4, count: 4, cores: [12, 35, 27, 19.6], load: [0.4, 0.3, 0.2] },
  memory: { total: 8589934592, used: 3221225472, available: 5368709120, percent: 37.5 },
  swap: { total: 0, used: 0, percent: 0 }, disk: { total: 107374182400, used: 45097156608, free: 62277025792, percent: 42 },
  diskIo: { read: 49152, write: 12288 }, network: { received: 32768, sent: 145408, interfaces: ["eth0"] },
  storage: { audio: { count: 38, bytes: 13314398617 }, images: { count: 62, bytes: 44040192 }, incomplete: false },
};

async function mock(page: Page, populated = true) {
  await page.route("**/api/artists", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/albums", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/beats", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/stats/server", (route) => route.fulfill({ json: server }));
  await page.route("**/api/stats/site?*", (route) => route.fulfill({ json: populated ? site : { ...site, summary: { visits: 0, views: 0, visitors: 0, plays: 0, adminActions: 0 }, series: site.series.map((point) => ({ ...point, visits: 0, views: 0, visitors: 0, plays: 0, adminActions: 0, admins: {} })), topTracks: [], admins: [] } }));
  await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 204 }));
}

test("public dashboard separates manual server measurements from analytics", async ({ page }) => {
  let measurements = 0;
  const events: unknown[] = [];
  await mock(page);
  await page.route("**/api/stats/server", (route) => { measurements++; return route.fulfill({ json: server }); });
  await page.route("**/api/analytics/events", (route) => { events.push(route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Звук в цифрах." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Хранилище проекта" })).toBeVisible();
  await expect(page.locator(".stats-kpis")).toContainText("138");
  await expect(page.locator(".stats-admin-table")).toContainText("god-admin");
  await expect(page.locator(".stats-top-tracks")).toContainText("Siberian Signal");
  await expect(page.locator('.site-header a[href="/stats"]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  expect(events).toEqual([]);
  expect(measurements).toBe(1);
  const request = page.waitForRequest("**/api/stats/site?period=30d");
  await page.getByRole("button", { name: "30 дней", exact: true }).click();
  await request;
  await expect(page.getByRole("button", { name: "30 дней", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(measurements).toBe(1);
  await page.evaluate(() => { window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("online")); });
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect.poll(() => measurements).toBe(2);
  await expect(page.getByRole("button", { name: "Обновить", exact: true })).toBeEnabled();
  await page.locator(".stats-chart").first().getByRole("button", { name: "Визиты", exact: true }).click();
  await expect(page.locator(".stats-chart").first().getByRole("button", { name: "Визиты", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: "О нас", exact: true }).click();
  await expect.poll(() => events.length).toBe(1);
  expect(events[0]).toMatchObject({ kind: "pageview", path: "/about" });
});

test("empty analytics and server failures remain readable and recoverable", async ({ page }) => {
  await mock(page, false);
  await page.route("**/api/stats/server", (route) => route.fulfill({ status: 503, json: { detail: "Сборщик метрик недоступен" } }));
  await page.goto("/stats");
  await expect(page.getByRole("alert")).toContainText("Сборщик метрик недоступен");
  await expect(page.getByText("Пока тихо", { exact: true })).toBeVisible();
  await expect(page.getByText("Пока нет действий", { exact: true })).toBeVisible();
  await page.route("**/api/stats/server", (route) => route.fulfill({ json: server }));
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Хранилище проекта" })).toBeVisible();
});

test("charts include the current day when collection starts after midnight", async ({ page }) => {
  await mock(page);
  await page.route("**/api/stats/site?*", (route) => route.fulfill({ json: { ...site, startedAt: now } }));
  await page.goto("/stats");
  const chart = page.locator(".stats-chart").first();
  await expect(chart.locator("svg circle")).toHaveCount(3);
  await chart.locator("summary").click();
  await expect(chart.locator("tbody tr").last()).not.toContainText("Нет данных");
  await expect(chart.locator("tbody tr").first()).toContainText("Нет данных");
});

test("playback counts actual starts without pause, buffering or seek duplicates", async ({ page }) => {
  const events: { kind: string; trackId?: number }[] = [];
  await mock(page);
  await page.route("**/api/beats", (route) => route.fulfill({ json: [1, 2].map((id) => ({ id, title: `Track ${id}`, artistId: 1, albumId: null, producer: "Artist", audioUrl: `/test/${id}.wav`, coverUrl: "", likes: 0 })) }));
  const buffer = Buffer.alloc(44 + 8000 * 60 * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36); buffer.writeUInt32LE(buffer.length - 44, 40);
  await page.route("**/test/*.wav", (route) => route.fulfill({ body: buffer, contentType: "audio/wav" }));
  await page.route("**/api/analytics/events", (route) => { events.push(route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
  await page.goto("/stats");
  await expect(page.getByRole("button", { name: "Воспроизвести", exact: true })).toBeEnabled();
  expect(events).toHaveLength(0);
  await page.getByRole("button", { name: "Воспроизвести", exact: true }).click();
  await expect.poll(() => events.length).toBe(1);
  expect(events[0].kind).toBe("play");
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await page.getByRole("button", { name: "Воспроизвести", exact: true }).click();
  await page.locator(".player-shell > audio").evaluate((audio: HTMLAudioElement) => { audio.currentTime = 10; audio.dispatchEvent(new Event("waiting")); audio.dispatchEvent(new Event("playing")); });
  expect(events).toHaveLength(1);
  await page.getByRole("button", { name: "Следующий трек", exact: true }).click();
  await expect.poll(() => events.length).toBe(2);
  await page.locator(".player-shell > audio").evaluate((audio: HTMLAudioElement) => audio.dispatchEvent(new Event("ended")));
  await expect.poll(() => events.length).toBe(3);
});

for (const [width, height] of [[320, 568], [390, 844], [768, 900], [1440, 900]]) {
  test(`dashboard fits ${width}px`, async ({ page }, testInfo) => {
    await mock(page);
    await page.setViewportSize({ width, height });
    await page.goto("/stats");
    await expect(page.locator(".stats-admin-table")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`stats-${width}.png`), fullPage: true });
  });
}

for (const [width, role] of [[320, "god"], [390, "artist"]] as const) {
  test(`admin statistics link works for ${role} at ${width}px`, async ({ page }, testInfo) => {
    await mock(page);
    const account = { id: 1, username: role === "god" ? "god-admin" : "artist-admin", role, artistId: role === "god" ? null : 1 };
    await page.route("**/api/auth/me", (route) => route.fulfill({ json: account }));
    await page.route("**/api/admin/catalog", (route) => route.fulfill({ json: { artists: [], albums: [], beats: [] } }));
    await page.route("**/api/admins", (route) => route.fulfill({ json: [account] }));
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/admin");
    const link = page.getByRole("link", { name: "Статистика", exact: true });
    await expect(link).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`admin-stats-link-${width}.png`) });
    await link.click();
    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.getByRole("heading", { name: "Звук в цифрах." })).toBeVisible();
  });
}

test.describe("touch dashboard", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("periods, chart values and manual refresh work with touch", async ({ page }) => {
    await mock(page);
    await page.goto("/stats");
    await page.getByRole("button", { name: "Обновить", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Обновить", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Год", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Год", exact: true })).toHaveAttribute("aria-pressed", "true");
    const chart = page.locator(".stats-chart").first();
    await chart.locator("rect").nth(3).tap();
    await expect(chart.locator(".stats-chart-readout")).toContainText("Визиты:");
    await chart.locator("summary").tap();
    await expect(chart.locator("table")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
