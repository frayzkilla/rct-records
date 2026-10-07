import { expect, test, type Page } from "@playwright/test";

const artist = { id: 1, name: "Артист с длинным именем / Raw Crownz", bio: "Музыка из Сибири.", avatarUrl: "" };
const album = { id: 10, title: "Альбом с длинным названием", artistId: 1, artist: artist.name, releaseDate: "2026-10-01", coverUrl: "" };
const track = { id: 1, title: "Очень длинное название трека без сокращений / RAW CROWNZ RECORDS / SIBERIA", artistId: 1, albumId: 10, producer: artist.name, audioUrl: "", coverUrl: "" };
const god = { id: 1, username: "god-admin", role: "god", artistId: null };
const artistAccount = { id: 2, username: "artist-account", role: "artist", artistId: 1 };

async function publicCatalog(page: Page) {
  for (const collection of ["beats", "albums", "artists"]) {
    await page.route(`**/api/${collection}`, (route) => route.fulfill({ json: [] }));
  }
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [width, height] of [[320, 568], [390, 844], [768, 900], [1440, 900], [1440, 650]]) {
  test(`welcome form fits the viewport at ${width}x${height}, including login errors`, async ({ page }, testInfo) => {
    await publicCatalog(page);
    await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401, json: { detail: "Не авторизован" } }));
    await page.route("**/api/auth/login", (route) => route.fulfill({ status: 401, json: { detail: "Неверный логин или пароль" } }));
    await page.setViewportSize({ width, height });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Welcome." })).toBeVisible();
    await expect(page.getByLabel("Логин", { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.getByLabel("Логин", { exact: true }).fill("artist");
    await page.getByLabel("Пароль", { exact: true }).fill("incorrect-password");
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText("Неверный логин или пароль");
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    const button = await page.getByRole("button", { name: "Войти", exact: true }).boundingBox();
    const player = await page.locator(".player-shell").boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(player!.y);
    if ([390, 1440].includes(width) && height > 650) {
      await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`) });
    }
  });
}

for (const width of [320, 768, 1440]) {
  test(`studio forms, record actions and role controls fit at ${width}px`, async ({ page }, testInfo) => {
    await publicCatalog(page);
    let savedTrack = { ...track };
    await page.route("**/api/auth/me", (route) => route.fulfill({ json: god }));
    await page.route("**/api/admin/catalog", (route) => route.fulfill({ json: { artists: [artist], albums: [album], beats: [savedTrack] } }));
    await page.route("**/api/admins", (route) => route.fulfill({ json: [god, artistAccount] }));
    await page.route("**/api/beats/1", async (route) => {
      expect(route.request().method()).toBe("PUT");
      expect(route.request().postDataBuffer()!.toString()).toContain("Обновлённый трек");
      savedTrack = { ...savedTrack, title: "Обновлённый трек" };
      await route.fulfill({ json: savedTrack });
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Your studio." })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Разделы админки" });
    await expect(tabs.getByRole("button")).toHaveCount(4);
    await page.getByRole("button", { name: `Редактировать: ${track.title}`, exact: true }).click();
    await expect(page.getByLabel("Название", { exact: true })).toBeFocused();
    await expectNoOverflow(page);
    const editor = await page.locator(".admin-editor").boundingBox();
    const list = await page.locator(".admin-records").boundingBox();
    expect(editor!.x + editor!.width <= list!.x || editor!.y + editor!.height <= list!.y).toBe(true);
    await page.getByLabel("Название", { exact: true }).fill("Обновлённый трек");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Изменения сохранены");
    await expect(page.locator(".admin-record h3")).toHaveText("Обновлённый трек");
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await page.getByLabel("Аудиофайл", { exact: true }).setInputFiles({ name: "очень-длинное-имя-аудиофайла-для-проверки-вёрстки.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("audio") });
    await expectNoOverflow(page);
    await page.getByRole("button", { name: "Отмена", exact: true }).click();
    await tabs.getByRole("button", { name: /Альбомы/ }).click();
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await expect(page.getByLabel("Дата релиза")).toBeVisible();
    await expectNoOverflow(page);
    await tabs.getByRole("button", { name: /Артисты/ }).click();
    await page.getByRole("button", { name: `Редактировать: ${artist.name}`, exact: true }).click();
    await expect(page.getByLabel("Биография")).toHaveValue(artist.bio);
    await expectNoOverflow(page);
    await tabs.getByRole("button", { name: /Администраторы/ }).click();
    await page.getByRole("button", { name: "Редактировать: god-admin", exact: true }).click();
    await expect(page.getByLabel("Логин", { exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Удалить: god-admin", exact: true })).toHaveCount(0);
    await expectNoOverflow(page);
    if ([320, 1440].includes(width)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`studio-${width}.png`), fullPage: true });
    }
  });
}

test("artist studio keeps ownership fields and returns to a compact welcome on logout", async ({ page }) => {
  await publicCatalog(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: artistAccount }));
  await page.route("**/api/admin/catalog", (route) => route.fulfill({ json: { artists: [artist], albums: [album], beats: [track] } }));
  await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 204 }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  const tabs = page.getByRole("navigation", { name: "Разделы админки" });
  await expect(tabs.getByRole("button")).toHaveCount(2);
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.locator('.admin-editor input[name="artistId"]')).toHaveValue("1");
  await expect(page.getByRole("combobox")).toHaveCount(1);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
});

test("expressive typography uses upright fonts across about and artists", async ({ page }) => {
  await publicCatalog(page);
  for (const route of ["/about", "/artists"]) {
    await page.goto(route);
    await expect(page.locator("em").first()).toBeVisible();
    const styles = await page.locator("em").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontStyle));
    expect(styles.length).toBeGreaterThan(0);
    expect(styles.every((style) => style === "normal")).toBe(true);
  }
});
