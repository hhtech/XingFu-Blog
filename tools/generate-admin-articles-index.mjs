import { promises as fs } from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const postsDir = path.join(workspaceRoot, "src", "content", "posts");
const outputFiles = [
  path.join(workspaceRoot, "site-public", "admin", "articles-index.json"),
  path.join(workspaceRoot, "static", "admin", "articles-index.json"),
];

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function parseYamlValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function parseFrontmatter(source) {
  const normalized = stripBom(source);
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    return { attributes: {}, body: normalized };
  }

  const attributes = {};
  let currentArrayKey = "";

  match[1].split(/\r?\n/).forEach((line) => {
    const arrayMatch = line.match(/^\s*-\s+(.+)$/);
    if (arrayMatch && currentArrayKey) {
      if (!Array.isArray(attributes[currentArrayKey])) attributes[currentArrayKey] = [];
      attributes[currentArrayKey].push(arrayMatch[1].trim().replace(/^['"]|['"]$/g, ""));
      return;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) return;

    const key = keyMatch[1];
    const rawValue = keyMatch[2];
    if (!rawValue.trim()) {
      attributes[key] = [];
      currentArrayKey = key;
      return;
    }

    attributes[key] = parseYamlValue(rawValue);
    currentArrayKey = "";
  });

  return {
    attributes,
    body: normalized.slice(match[0].length),
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null || value === "") return [];
  return [String(value).trim()].filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = stripBom(markdown).replace(/\r/g, "").split("\n");
  const html = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    flushList();

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      html.push(`<blockquote>${formatInlineMarkdown(trimmed.replace(/^>\s+/, ""))}</blockquote>`);
      continue;
    }

    html.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
  }

  flushList();
  return html.join("") || "<p></p>";
}

function normalizeBody(body) {
  const normalized = stripBom(body).trim();
  if (!normalized) return "<p></p>";
  return /<[a-z][\s\S]*>/i.test(normalized) ? normalized : markdownToHtml(normalized);
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripHtml(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function collectOutline(html) {
  const matches = [...String(html || "").matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  return matches
    .map((match, index) => ({
      id: `outline-${index}`,
      level: Number(match[1]),
      text: stripHtml(match[2]),
    }))
    .filter((item) => item.text);
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

function sortValue(post) {
  return String(post.updateDate || post.publishDate || post.date || "");
}

async function buildIndex() {
  const files = (await fs.readdir(postsDir))
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));

  const posts = [];
  for (const fileName of files) {
    const filePath = path.join(postsDir, fileName);
    const source = await fs.readFile(filePath, "utf8");
    const parsed = parseFrontmatter(source);
    const attributes = parsed.attributes || {};
    const slug = String(attributes.slug || fileName.replace(/\.md$/i, "")).trim();
    const publishDate = String(attributes.publishDate || attributes.date || "").trim() || new Date().toISOString();
    const updateDate = String(attributes.updateDate || attributes.lastmod || publishDate).trim() || publishDate;
    const html = normalizeBody(parsed.body);
    const plainText = stripHtml(html);
    const draft = !!attributes.draft;

    posts.push({
      slug,
      path: `src/content/posts/${fileName}`,
      title: String(attributes.title || slug).trim() || slug,
      date: publishDate,
      publishDate,
      updateDate,
      dateLabel: formatDate(updateDate || publishDate),
      status: draft ? "草稿" : "已发布",
      draft,
      author: "XF",
      tags: normalizeArray(attributes.tags),
      categories: normalizeArray(attributes.category || attributes.categories),
      description: String(attributes.description || "").trim(),
      keywords: normalizeArray(attributes.keywords),
      aliases: normalizeArray(attributes.aliases),
      weight: attributes.weight || "",
      coverImage: String(attributes.cover || "").trim(),
      excerpt: plainText.slice(0, 90),
      html,
      plainText,
      outline: collectOutline(html),
      rawBody: parsed.body,
    });
  }

  posts.sort((left, right) => sortValue(right).localeCompare(sortValue(left)));

  const payload = `${JSON.stringify(posts, null, 2)}\n`;
  await Promise.all(
    outputFiles.map(async (outputFile) => {
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, payload, "utf8");
    })
  );
}

await buildIndex();
