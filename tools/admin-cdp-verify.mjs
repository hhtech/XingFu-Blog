import { spawn } from "node:child_process";
import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4174/admin/";
const outDir = join(process.cwd(), "test-results", "admin-cdp");
const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveChromePath() {
  for (const candidate of chromeCandidates) {
    if (await pathExists(candidate)) return candidate;
  }
  throw new Error("No Chrome/Edge executable found for CDP verification.");
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }

      const waiters = this.eventWaiters.get(message.method);
      if (!waiters || waiters.length === 0) return;
      const waiter = waiters.shift();
      waiter(message.params ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(payload);
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push(resolve);
      this.eventWaiters.set(method, waiters);
    });
  }
}

async function waitForDebuggerTarget(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const pageTarget = targets.find((target) => target.type === "page");
      if (pageTarget?.webSocketDebuggerUrl) return pageTarget.webSocketDebuggerUrl;
    } catch {
      // Ignore until the debugger endpoint is ready.
    }

    await wait(250);
  }

  throw new Error("Timed out waiting for the Chrome debugger target.");
}

async function connectCdp(port) {
  const wsUrl = await waitForDebuggerTarget(port);
  const socket = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const client = new CdpClient(socket);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("DOM.enable");
  await client.send("Input.setIgnoreInputEvents", { ignore: false });
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send("Emulation.setDefaultBackgroundColorOverride", {
    color: { r: 255, g: 255, b: 255, a: 1 },
  });
  return client;
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });

  return result.result?.value;
}

async function waitFor(client, expression, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const passed = await evaluate(client, expression);
    if (passed) return;
    await wait(200);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

async function navigate(client, url) {
  const loaded = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url });
  await loaded;
  await wait(1800);
}

async function click(client, selector) {
  const box = await evaluate(
    client,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    })()`,
  );

  if (!box) throw new Error(`Could not find clickable selector: ${selector}`);

  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: box.x,
    y: box.y,
    button: "left",
    clickCount: 1,
  });

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: box.x,
    y: box.y,
    button: "left",
    clickCount: 1,
  });
}

async function pressEnter(client) {
  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
}

async function capture(client, filename) {
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  await writeFile(join(outDir, filename), Buffer.from(data, "base64"));
}

async function fillTitle(client, title) {
  await evaluate(
    client,
    `(() => {
      const input = document.querySelector('.title-input');
      if (!input) return false;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor.set.call(input, ${JSON.stringify(title)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return input.value;
    })()`,
  );
}

async function fillPageEditor(client) {
  await click(client, ".tiptap-editor");
  await client.send("Input.insertText", { text: "Halo 风格页面验证" });
  await pressEnter(client);
  await pressEnter(client);
  await client.send("Input.insertText", {
    text: "第一段：检查真实编辑器输入、回车和分栏预览是否同步。",
  });
  await pressEnter(client);
  await pressEnter(client);
  await client.send("Input.insertText", { text: "第二段：继续填充一些中文内容，确认布局不塌。" });
  await pressEnter(client);
  await client.send("Input.insertText", { text: "分类、标签、附件、菜单这些入口也会继续验证。" });
}

async function summarizePageModes(client) {
  const modes = ["分栏", "编辑", "预览"];
  const summary = {};

  for (const label of modes) {
    await evaluate(
      client,
      `(() => {
        const target = Array.from(document.querySelectorAll('.mode-button')).find((node) => node.innerText.trim() === ${JSON.stringify(label)});
        if (!target) return false;
        target.click();
        return true;
      })()`,
    );
    await wait(350);

    summary[label] = await evaluate(
      client,
      `(() => ({
        activeMode: Array.from(document.querySelectorAll('.mode-button')).find((node) => node.classList.contains('active'))?.innerText.trim() ?? '',
        paneCount: document.querySelectorAll('.composer-content .composer-pane').length,
        hasEditor: !!document.querySelector('.tiptap-editor'),
        hasPreview: !!document.querySelector('.tiptap-preview'),
        paneTitles: Array.from(document.querySelectorAll('.composer-pane-title')).map((node) => node.innerText.trim())
      }))()`,
    );
  }

  await evaluate(
    client,
    `(() => {
      const target = Array.from(document.querySelectorAll('.mode-button')).find((node) => node.innerText.trim() === '分栏');
      if (!target) return false;
      target.click();
      return true;
    })()`,
  );
  await wait(300);

  return summary;
}

async function collectButtonSummary(client) {
  return evaluate(
    client,
    `(() => ({
      topButtons: Array.from(document.querySelectorAll('.editor-assistbar-actions button')).map((node) => node.innerText.trim()),
      toolbarButtons: Array.from(document.querySelectorAll('.composer-toolbar .composer-icon-button')).slice(0, 12).map((node) => ({
        label: node.getAttribute('aria-label') ?? '',
        disabled: node.disabled,
        active: node.classList.contains('active')
      })),
      inspectorButtons: Array.from(document.querySelectorAll('.inspector-pane button')).map((node) => ({
        label: node.innerText.trim(),
        disabled: node.disabled
      }))
    }))()`,
  );
}

async function collectViewHeadings(client, baseUrlValue) {
  const views = ["overview", "articles", "pages", "media", "taxonomies", "frontend", "settings"];
  const summary = {};

  for (const view of views) {
    await navigate(client, `${baseUrlValue}?view=${view}`);
    await wait(600);
    summary[view] = await evaluate(
      client,
      `(() => ({
        heading: document.querySelector('h2')?.innerText ?? '',
        activeNav: document.querySelector('.workspace-link.active')?.innerText.trim() ?? '',
        hasGrid: !!document.querySelector('.articles-grid, .settings-grid')
      }))()`,
    );
  }

  return summary;
}

async function run() {
  await mkdir(outDir, { recursive: true });

  const chromePath = await resolveChromePath();
  const userDataDir = await mkdtemp(join(tmpdir(), "xingfu-admin-cdp-"));
  const port = 9333;
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  let client;

  try {
    client = await connectCdp(port);

    await navigate(client, `${baseUrl}?view=pages`);
    await waitFor(client, "!!document.querySelector('.tiptap-editor')", "page editor");
    await fillTitle(client, "Halo 页面编辑复刻验证");
    await fillPageEditor(client);
    await wait(1200);

    const pagesSummary = await evaluate(
      client,
      `(() => ({
        title: document.querySelector('.title-input')?.value ?? '',
        editorText: document.querySelector('.tiptap-editor')?.innerText ?? '',
        previewText: document.querySelector('.tiptap-preview')?.innerText ?? '',
        statusText: document.querySelector('.composer-statusbar')?.innerText ?? ''
      }))()`,
    );
    const modeSummary = await summarizePageModes(client);
    const buttonSummary = await collectButtonSummary(client);

    await capture(client, "pages-editor-filled.png");

    await navigate(client, `${baseUrl}?view=settings`);
    await waitFor(client, "!!document.querySelector('.settings-grid')", "settings grid");
    const settingsSummary = await evaluate(
      client,
      `(() => ({
        heading: document.querySelector('h2')?.innerText ?? '',
        owner: document.querySelector('input[value=\"hhtech\"]')?.value ?? '',
        repo: document.querySelector('input[value=\"XingFu-Blog\"]')?.value ?? '',
        postDir: Array.from(document.querySelectorAll('label')).find((node) => node.innerText.includes('文章目录'))?.querySelector('input')?.value ?? '',
        pageDir: Array.from(document.querySelectorAll('label')).find((node) => node.innerText.includes('页面目录'))?.querySelector('input')?.value ?? '',
        uploadDir: Array.from(document.querySelectorAll('label')).find((node) => node.innerText.includes('上传目录'))?.querySelector('input')?.value ?? ''
      }))()`,
    );
    await capture(client, "settings.png");

    const gatedViews = {};
    for (const view of ["media", "taxonomies", "frontend"]) {
      await navigate(client, `${baseUrl}?view=${view}`);
      await wait(1200);
      gatedViews[view] = await evaluate(
        client,
        `(() => ({
          heading: document.querySelector('h2')?.innerText ?? '',
          prompt: Array.from(document.querySelectorAll('div, p, span'))
            .map((node) => node.innerText?.trim())
            .find((text) => text && text.includes('请先连接 GitHub 仓库')) ?? ''
        }))()`,
      );
      await capture(client, `${view}.png`);
    }

    const viewHeadings = await collectViewHeadings(client, baseUrl);

    const summary = {
      pages: pagesSummary,
      modes: modeSummary,
      buttons: buttonSummary,
      settings: settingsSummary,
      gatedViews,
      views: viewHeadings,
    };

    await writeFile(join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (client?.socket?.readyState === WebSocket.OPEN) {
      client.socket.close();
    }

    chrome.kill();
    await wait(800);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

await run();
