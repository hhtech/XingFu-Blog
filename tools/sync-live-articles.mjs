import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const siteRoot = "https://hhtech.github.io/XingFu-Blog";
const defaultOutputFiles = [
  path.join(workspaceRoot, "site-public", "admin", "articles-index.json"),
  path.join(workspaceRoot, "static", "admin", "articles-index.json"),
];

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(value) {
  return decodeEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value || "");
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function collectOutline(html) {
  return [...String(html || "").matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match, index) => ({
      id: `outline-${index}`,
      level: Number(match[1]),
      text: stripHtml(match[2]),
    }))
    .filter((item) => item.text);
}

function repairLegacyImageHtml(html) {
  return String(html || "").replace(/!\s*<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_, __, href, text) => {
    const alt = stripHtml(text || "").trim();
    return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" />`;
  });
}

function absoluteUrl(value) {
  if (!value) return "";
  return new URL(value, `${siteRoot}/`).toString();
}

function getTagValue(source, tag) {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeEntities(match[1].trim()) : "";
}

function getSlugFromUrl(value) {
  const pathname = new URL(value).pathname.replace(/\/+$/, "");
  return pathname.split("/").filter(Boolean).pop() || "";
}

function extractArticleContent(html) {
  const match = html.match(/<div id="post-content"[^>]*>([\s\S]*?)<\/div>\s*<aside/i);
  return match ? repairLegacyImageHtml(match[1].trim()) : "<p></p>";
}

function extractArticleTitle(html, fallbackTitle) {
  const direct = html.match(/<div class="text-center[^"]*?font-bold"[^>]*>([\s\S]*?)<\/div>/i);
  if (direct) return stripHtml(direct[1]);

  const headTitle = html.match(/<title>\s*([\s\S]*?)\|\s*Xing Fu/i);
  if (headTitle) return decodeEntities(headTitle[1].trim());

  return fallbackTitle;
}

function extractArticleTimes(html) {
  return [...html.matchAll(/<time[^>]*>([\s\S]*?)<\/time>/gi)].map((match) => stripHtml(match[1]));
}

function extractTaxonomyLinks(html, segment) {
  const links = [...html.matchAll(new RegExp(`<a[^>]+href="[^"]*\\/${segment}\\/[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`, "gi"))];
  return [...new Set(links.map((match) => stripHtml(match[1])).filter(Boolean))];
}

async function readExistingIndex() {
  const candidates = [
    path.join(workspaceRoot, "static", "admin", "articles-index.json"),
    path.join(workspaceRoot, "site-public", "admin", "articles-index.json"),
    path.join(workspaceRoot, "dist", "admin", "articles-index.json"),
  ];

  for (const filePath of candidates) {
    try {
      const payload = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(payload);
      return Array.isArray(data) ? data : [];
    } catch {}
  }

  return [];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "XingFu-Blog local admin sync",
      Accept: "text/html,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function buildLiveArticles(existingMap) {
  const rssText = await fetchText(`${siteRoot}/rss.xml`);
  const items = [...rssText.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  const posts = await Promise.all(
    items.map(async (item) => {
      const link = getTagValue(item, "link");
      const slug = getSlugFromUrl(link);
      const rssTitle = getTagValue(item, "title") || slug;
      const rssDescription = getTagValue(item, "description");
      const publishDate = getTagValue(item, "pubDate");
      const existing = existingMap.get(slug) || {};

      const articleHtml = await fetchText(absoluteUrl(link));
      const title = extractArticleTitle(articleHtml, rssTitle);
      const times = extractArticleTimes(articleHtml);
      const content = extractArticleContent(articleHtml);
      const plainText = stripHtml(content);
      const categories = extractTaxonomyLinks(articleHtml, "categories");
      const tags = extractTaxonomyLinks(articleHtml, "tags");
      const resolvedPublishDate = existing.publishDate || times[0] || publishDate || new Date().toISOString();
      const resolvedUpdateDate = existing.updateDate || times[1] || resolvedPublishDate;

      return {
        slug,
        path: existing.path || "",
        sha: existing.sha || "",
        title,
        date: resolvedPublishDate,
        publishDate: resolvedPublishDate,
        updateDate: resolvedUpdateDate,
        dateLabel: formatDate(resolvedUpdateDate || resolvedPublishDate),
        status: "已发布",
        draft: false,
        author: existing.author || "XF",
        tags: tags.length ? tags : Array.isArray(existing.tags) ? existing.tags : [],
        categories: categories.length ? categories : Array.isArray(existing.categories) ? existing.categories : [],
        description: existing.description || rssDescription || plainText.slice(0, 120),
        keywords: Array.isArray(existing.keywords) ? existing.keywords : [],
        aliases: Array.isArray(existing.aliases) ? existing.aliases : [],
        weight: existing.weight || "",
        coverImage: existing.coverImage || "",
        excerpt: rssDescription || plainText.slice(0, 90),
        html: content,
        plainText,
        outline: collectOutline(content),
        rawBody: existing.rawBody || content,
      };
    })
  );

  return posts.sort((left, right) =>
    String(right.updateDate || right.publishDate || "").localeCompare(String(left.updateDate || left.publishDate || ""))
  );
}

async function writeOutput(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const outputFiles = process.argv.slice(2).length
  ? process.argv.slice(2).map((filePath) => path.resolve(workspaceRoot, filePath))
  : defaultOutputFiles;

const existingIndex = await readExistingIndex();
const existingMap = new Map(existingIndex.map((item) => [item.slug, item]));
const payload = await buildLiveArticles(existingMap);

await Promise.all(outputFiles.map((filePath) => writeOutput(filePath, payload)));

console.log(`Synced ${payload.length} live articles to:`);
outputFiles.forEach((filePath) => console.log(`- ${filePath}`));
