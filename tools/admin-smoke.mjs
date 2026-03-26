import { chromium } from "playwright";

const baseUrl = process.env.ADMIN_BASE_URL || "http://127.0.0.1:4321/admin/";

function log(label, value) {
  console.log(`${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

async function clickByText(page, text, options = {}) {
  const locator = page.getByRole("button", { name: text, exact: true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 10000 });
  await locator.click();
}

async function clickWorkspaceLink(page, text) {
  const locator = page.locator(".workspace-link").filter({ has: page.locator(`text=${text}`) }).first();
  await locator.waitFor({ state: "visible", timeout: 10000 });
  await locator.click();
}

async function collectVisibleButtons(page) {
  return page.locator("button:visible").evaluateAll((nodes) =>
    nodes
      .map((node) => node.textContent?.trim())
      .filter(Boolean)
  );
}

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 1462, height: 651 },
});

const page = await context.newPage();

try {
  await page.goto(`${baseUrl}?connect=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".workspace-link").first().waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(1500);

  log("initialUrl", page.url());
  log("initialButtons", await collectVisibleButtons(page));

  const connectExists = (await page.getByRole("button", { name: /连接/ }).count()) > 0;
  log("connectButtonExists", connectExists);

  await clickWorkspaceLink(page, "文章");
  await page.waitForTimeout(800);
  log("articleViewUrl", page.url());

  const articleItems = page.locator(".halo-article-row");
  const articleCount = await articleItems.count();
  log("articleCount", articleCount);

  const articleButton = page.locator('.halo-article-row[data-slug="2222"]').first();
  if ((await articleButton.count()) > 0) {
    await articleButton.click();
  } else {
    const firstArticleAction = page.locator(".halo-article-row").first();
    await firstArticleAction.click();
  }

  await page.waitForTimeout(1200);
  await page.waitForTimeout(1200);
  log("articleDetailUrl", page.url());

  const actionLabels = await page
    .locator(".halo-article-page-actions button:visible")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean));
  log("articleActions", actionLabels);

  const articleEditor = page.locator(".halo-article-editor-canvas").first();
  await articleEditor.waitFor({ state: "visible", timeout: 10000 });
  const initialImages = await articleEditor.locator("img").count();
  log("articleImageCountBeforeDelete", initialImages);

  if (initialImages > 0) {
    await articleEditor.locator("img").first().click({ force: true });
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);
  }

  const afterDeleteImages = await articleEditor.locator("img").count();
  log("articleImageCountAfterDelete", afterDeleteImages);

  await page.locator('[data-article-action="toggle-preview"]').click();
  await page.waitForTimeout(400);
  log("articlePreviewEditable", await articleEditor.getAttribute("contenteditable"));

  await page.locator('[data-article-action="toggle-preview"]').click();
  await page.waitForTimeout(300);

  const historyButton = page.locator('[data-article-action="toggle-history"]').first();
  if ((await historyButton.count()) > 0) {
    await historyButton.click();
    await page.waitForTimeout(1200);
    const historyVisible = (await page.locator(".halo-history-modal:visible").count()) > 0;
    log("articleHistoryVisible", historyVisible);
    const closeHistory = page.getByRole("button", { name: "关闭", exact: true }).first();
    if ((await closeHistory.count()) > 0) {
      await closeHistory.click();
    }
  }

  await clickWorkspaceLink(page, "页面");
  await page.waitForTimeout(1200);
  await page.waitForTimeout(1200);
  log("pagesBodyClass", await page.locator("body").getAttribute("class"));

  const newPageButton = page.locator("button:visible").filter({ hasText: "新建" }).first();
  if ((await newPageButton.count()) > 0) {
    await newPageButton.click();
    await page.waitForTimeout(600);
  }

  const titleInput = page.locator("input.title-input, .editor-heading input").first();
  const editor = page.locator(".tiptap-editor").first();
  const preview = page.locator(".tiptap-preview").first();

  if ((await titleInput.count()) > 0) {
    await titleInput.fill("自动化页面草稿");
  }
  if ((await editor.count()) > 0) {
    await editor.click();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await page.keyboard.type("页面预览联动测试");
  }

  await clickByText(page, "预览");
  await page.waitForTimeout(500);
  log("pagesPreviewVisible", await preview.isVisible());
  log("pagesPreviewText", await preview.textContent());

  const screenshotPath = "D:/java/blog/XingFu-Blog/.codex-admin-smoke.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log("screenshot", screenshotPath);
} finally {
  await context.close();
  await browser.close();
}
