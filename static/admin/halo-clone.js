(function () {
  const viewLabelMap = {
    overview: "仪表盘",
    articles: "文章",
    pages: "页面",
    media: "附件",
    taxonomies: "分类/标签",
    frontend: "主题/菜单",
    settings: "设置",
  };

  const queryViewMap = {
    overview: "仪表盘",
    dashboard: "仪表盘",
    articles: "文章",
    posts: "文章",
    pages: "页面",
    media: "附件",
    attachment: "附件",
    attachments: "附件",
    taxonomies: "分类/标签",
    taxonomy: "分类/标签",
    categories: "分类/标签",
    tags: "分类/标签",
    frontend: "主题/菜单",
    theme: "主题/菜单",
    themes: "主题/菜单",
    menu: "主题/菜单",
    menus: "主题/菜单",
    settings: "设置",
  };

  const state = {
    queryApplied: false,
    openFirstApplied: false,
    connectApplied: false,
    applying: false,
    articleDataLoaded: false,
    articleDataLoading: false,
    articleDataError: "",
    articlePosts: [],
    articleMode: "list",
    articleSelectedSlug: "",
    articleSearch: "",
    articleInspectorTab: "outline",
    articlePreviewMode: false,
    articleHistoryOpen: false,
    articleHistoryLoading: false,
    articleHistoryError: "",
    articleHistoryItems: [],
    articleHistorySlug: "",
    articleNotice: "",
    articleError: "",
    articleSavingAction: "",
  };

  const articleSource = {
    owner: "hhtech",
    repo: "XingFu-Blog",
    branch: "main",
    dir: "src/content/posts",
  };
  const settingsStorageKey = "blog-admin-settings";
  const tokenStorageKey = "blog-admin-token";

  function buttonText(button) {
    return button ? button.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function setButtonLabel(button, label) {
    if (!button) return;
    const textNode = Array.from(button.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );

    if (textNode) {
      textNode.textContent = " " + label;
      return;
    }

    button.append(document.createTextNode(" " + label));
  }

  function findNavButton(name) {
    return Array.from(document.querySelectorAll(".workspace-link")).find((button) =>
      buttonText(button).includes(name)
    );
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugifyFileName(name) {
    return name.replace(/\.md$/i, "");
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

  function parseFrontmatter(markdown) {
    const normalizedMarkdown = String(markdown || "").replace(/^\uFEFF/, "");
    const match = normalizedMarkdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!match) return { attributes: {}, body: normalizedMarkdown };

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
      body: normalizedMarkdown.slice(match[0].length),
    };
  }

  function formatInlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
        const titleAttribute = title ? ` title="${title}"` : "";
        return `<img src="${src}" alt="${alt}"${titleAttribute} />`;
      })
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r/g, "").split("\n");
    const html = [];
    let listItems = [];

    function flushList() {
      if (!listItems.length) return;
      html.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        listItems.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
        return;
      }

      flushList();

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        html.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
        return;
      }

      if (/^>\s+/.test(trimmed)) {
        html.push(`<blockquote>${formatInlineMarkdown(trimmed.replace(/^>\s+/, ""))}</blockquote>`);
        return;
      }

      html.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
    });

    flushList();
    return html.join("") || "<p></p>";
  }

  function stripHtml(value) {
    const node = document.createElement("div");
    node.innerHTML = value;
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function formatDate(dateValue) {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return dateValue || "未设置日期";
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
      parsed.getDate()
    ).padStart(2, "0")} ${String(parsed.getHours()).padStart(2, "0")}:${String(
      parsed.getMinutes()
    ).padStart(2, "0")}`;
  }

  function formatDateTimeLocal(dateValue) {
    const parsed = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function encodeRepoPath(path) {
    return path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  function defaultArticleSettings() {
    return {
      owner: articleSource.owner,
      repo: articleSource.repo,
      branch: articleSource.branch,
      contentRoot: articleSource.dir,
      pageRoot: "src/content/pages",
      uploadRoot: "site-public/upload",
      configPath: "src/config/theme.yaml",
      paramsPath: "src/config/theme.yaml",
      menuPath: "src/config/theme.yaml",
      authBaseUrl: "https://auth.sunmer.top",
    };
  }

  function normalizeArticleSettings(value) {
    const defaults = defaultArticleSettings();
    const legacyMap = new Map([
      ["content/post", defaults.contentRoot],
      ["config/_default/config.toml", defaults.configPath],
      ["content/page", defaults.pageRoot],
      ["static/upload", defaults.uploadRoot],
      ["config/_default/params.toml", defaults.paramsPath],
      ["config/_default/menu.toml", defaults.menuPath],
    ]);

    const normalized = { ...defaults, ...(value || {}) };
    ["contentRoot", "pageRoot", "uploadRoot", "configPath", "paramsPath", "menuPath"].forEach((key) => {
      const current = String(normalized[key] || "").trim();
      normalized[key] = current ? legacyMap.get(current) || current : defaults[key];
    });
    normalized.authBaseUrl = String(normalized.authBaseUrl || "").trim() || defaults.authBaseUrl;
    return normalized;
  }

  function getStoredArticleSettings() {
    try {
      const raw = window.localStorage.getItem(settingsStorageKey);
      return raw ? normalizeArticleSettings(JSON.parse(raw)) : defaultArticleSettings();
    } catch {
      return defaultArticleSettings();
    }
  }

  function getStoredArticleToken() {
    try {
      return window.localStorage.getItem(tokenStorageKey) || "";
    } catch {
      return "";
    }
  }

  function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function base64ToUtf8(value) {
    const binary = window.atob(value.replace(/\n/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function csvToList(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeArrayValue(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    if (typeof value === "string") return csvToList(value);
    if (value === undefined || value === null || value === "") return [];
    return [String(value).trim()].filter(Boolean);
  }

  function normalizeArticleBody(body) {
    const normalized = String(body || "").replace(/^\uFEFF/, "").trim();
    if (!normalized) return "<p></p>";
    return /<[a-z][\s\S]*>/i.test(normalized) ? normalized : markdownToHtml(normalized);
  }

  function editorBodyHtml(html) {
    const normalized = String(html || "").trim();
    return normalized || "<p></p>";
  }

  function articleStatusText(draft) {
    return draft ? "草稿" : "已发布";
  }

  function articleSortValue(post) {
    return String(post.updateDate || post.publishDate || post.date || "");
  }

  function sanitizeArticleSlug(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return normalized || `draft-${Date.now()}`;
  }

  function normalizeArticleRecord(post) {
    const publishDate = post.publishDate || post.date || new Date().toISOString();
    const updateDate = post.updateDate || publishDate;
    const html = normalizeArticleBody(post.html || post.rawBody || "");
    const plainText = post.plainText || stripHtml(html);
    const draft = typeof post.draft === "boolean" ? post.draft : post.status === "草稿";

    return {
      ...post,
      slug: sanitizeArticleSlug(post.slug || post.title),
      title: String(post.title || post.slug || "未命名文章").trim() || "未命名文章",
      publishDate,
      updateDate,
      date: publishDate,
      dateLabel: formatDate(updateDate || publishDate),
      draft,
      status: articleStatusText(draft),
      author: post.author || "XF",
      description: String(post.description || "").trim(),
      keywords: normalizeArrayValue(post.keywords),
      aliases: normalizeArrayValue(post.aliases),
      weight: post.weight || "",
      coverImage: String(post.coverImage || post.cover || "").trim(),
      tags: normalizeArrayValue(post.tags),
      categories: normalizeArrayValue(post.category || post.categories),
      html,
      rawBody: post.rawBody || html,
      plainText,
      excerpt: post.excerpt || plainText.slice(0, 90),
      outline: Array.isArray(post.outline) ? post.outline : collectOutline(html),
      sha: post.sha || "",
      path: post.path || "",
    };
  }

  function yamlString(value) {
    return JSON.stringify(String(value));
  }

  function htmlToMarkdown(html) {
    const container = document.createElement("div");
    container.innerHTML = html;

    function serializeChildren(node) {
      return Array.from(node.childNodes)
        .map((child, index) => serializeNode(child, index))
        .join("");
    }

    function serializeNode(node, index) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.replace(/\u00a0/g, " ");
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toLowerCase();
      const content = serializeChildren(node).trim();

      switch (tag) {
        case "h1":
          return `# ${content}\n\n`;
        case "h2":
          return `## ${content}\n\n`;
        case "h3":
          return `### ${content}\n\n`;
        case "p":
          return `${content}\n\n`;
        case "br":
          return "\n";
        case "strong":
        case "b":
          return `**${content}**`;
        case "em":
        case "i":
          return `*${content}*`;
        case "u":
          return content;
        case "code":
          return node.parentElement?.tagName.toLowerCase() === "pre" ? node.textContent : `\`${content}\``;
        case "pre":
          return `\`\`\`\n${node.textContent.trim()}\n\`\`\`\n\n`;
        case "blockquote":
          return `${content
            .split(/\n+/)
            .map((line) => `> ${line}`)
            .join("\n")}\n\n`;
        case "ul":
          return `${Array.from(node.children)
            .map((child) => `- ${serializeChildren(child).trim()}`)
            .join("\n")}\n\n`;
        case "ol":
          return `${Array.from(node.children)
            .map((child, itemIndex) => `${itemIndex + 1}. ${serializeChildren(child).trim()}`)
            .join("\n")}\n\n`;
        case "a":
          return `[${content || node.getAttribute("href") || ""}](${node.getAttribute("href") || "#"})`;
        case "img":
          return `![${node.getAttribute("alt") || ""}](${node.getAttribute("src") || ""})\n\n`;
        case "hr":
          return `---\n\n`;
        case "div":
        case "section":
          return `${serializeChildren(node)}${tag === "div" && index < node.parentNode.childNodes.length - 1 ? "\n" : ""}`;
        default:
          return serializeChildren(node);
      }
    }

    return serializeChildren(container).replace(/\n{3,}/g, "\n\n").trim();
  }

  function buildArticleMarkdown(post) {
    const publishDate = post.publishDate || post.date || new Date().toISOString();
    const updateDate = post.updateDate || new Date().toISOString();
    const lines = [
      "---",
      `title: ${yamlString(post.title || post.slug || "未命名文章")}`,
      `slug: ${yamlString(post.slug)}`,
      `publishDate: ${yamlString(publishDate)}`,
      `updateDate: ${yamlString(updateDate)}`,
      `draft: ${post.draft ? "true" : "false"}`,
    ];

    if (post.description) lines.push(`description: ${yamlString(post.description)}`);
    if (post.categories?.length) {
      lines.push("categories:");
      post.categories.forEach((item) => lines.push(`  - ${yamlString(item)}`));
    }
    if (post.tags?.length) {
      lines.push("tags:");
      post.tags.forEach((item) => lines.push(`  - ${yamlString(item)}`));
    }
    if (post.keywords?.length) lines.push(`keywords: [${post.keywords.map(yamlString).join(", ")}]`);
    if (post.aliases?.length) lines.push(`aliases: [${post.aliases.map(yamlString).join(", ")}]`);
    if (post.weight) lines.push(`weight: ${post.weight}`);
    if (post.coverImage) lines.push(`cover: ${yamlString(post.coverImage)}`);

    lines.push("---", "", editorBodyHtml(post.html), "");
    return lines.join("\n");
  }

  function buildArticlePath(root, slug) {
    return `${String(root || articleSource.dir).replace(/\/$/, "")}/${slug}.md`;
  }

  async function fetchText(url, token = "") {
    const headers = {
      Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      let message = `GitHub API ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.message) {
          message = `${message}: ${payload.message}`;
        }
      } catch {}
      throw new Error(message);
    }

    return response.text();
  }

  async function fetchJson(url, token = "", init = {}) {
    const headers = {
      Accept: "application/vnd.github+json",
      ...(init.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const response = await fetch(url, {
      ...init,
      headers,
      body: init.body && typeof init.body !== "string" ? JSON.stringify(init.body) : init.body,
    });

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    return response.json();
  }

  function collectOutline(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    return Array.from(wrapper.querySelectorAll("h1, h2, h3"))
      .map((node, index) => ({
        id: `outline-${index}`,
        level: Number(node.tagName.slice(1)),
        text: node.textContent.trim(),
      }))
      .filter((item) => item.text);
  }

  function currentArticle() {
    return state.articlePosts.find((post) => post.slug === state.articleSelectedSlug) || null;
  }

  function resetArticleOverlayState() {
    state.articlePreviewMode = false;
    state.articleHistoryOpen = false;
    state.articleHistoryLoading = false;
    state.articleHistoryError = "";
    state.articleHistoryItems = [];
    state.articleHistorySlug = "";
  }

  function syncArticleQuery() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "articles");

    if (state.articleMode === "editor" && state.articleSelectedSlug) {
      url.searchParams.set("post", state.articleSelectedSlug);
    } else {
      url.searchParams.delete("post");
    }

    window.history.replaceState({}, "", url);
  }

  function setArticleMode(mode, slug = "") {
    state.articleMode = mode;
    state.articleSelectedSlug = slug;
    state.articleNotice = "";
    state.articleError = "";
    resetArticleOverlayState();
    syncArticleQuery();
    renderArticlesWorkspace();
  }

  async function loadArticleHistory(post) {
    if (!post?.path) {
      state.articleHistoryItems = [];
      state.articleHistoryError = "当前文章还没有仓库路径，暂时无法查看版本历史。";
      state.articleHistoryLoading = false;
      renderArticlesWorkspace();
      return;
    }

    if (state.articleHistoryLoading && state.articleHistorySlug === post.slug) {
      return;
    }

    state.articleHistoryLoading = true;
    state.articleHistoryError = "";
    state.articleHistorySlug = post.slug;
    renderArticlesWorkspace();

    try {
      const settings = getStoredArticleSettings();
      const token = getStoredArticleToken();
      const commits = await fetchJson(
        `https://api.github.com/repos/${settings.owner}/${settings.repo}/commits?path=${encodeURIComponent(
          post.path
        )}&sha=${encodeURIComponent(settings.branch)}&per_page=12`,
        token
      );

      state.articleHistoryItems = Array.isArray(commits)
        ? commits.map((item) => ({
            sha: String(item.sha || "").slice(0, 7),
            message: String(item.commit?.message || "无提交说明").split("\n")[0],
            author: item.commit?.author?.name || item.author?.login || "未知作者",
            date: formatDate(item.commit?.author?.date || item.commit?.committer?.date || ""),
            url: item.html_url || "",
          }))
        : [];
      if (!state.articleHistoryItems.length) {
        state.articleHistoryError = "当前文章还没有可展示的提交记录。";
      }
    } catch (error) {
      state.articleHistoryItems = [];
      state.articleHistoryError = error instanceof Error ? error.message : "版本历史加载失败";
    } finally {
      state.articleHistoryLoading = false;
      renderArticlesWorkspace();
    }
  }

  function applyArticleQueryState() {
    const params = new URLSearchParams(window.location.search);
    const requestedPost = params.get("post");

    if (requestedPost && state.articlePosts.some((post) => post.slug === requestedPost)) {
      state.articleMode = "editor";
      state.articleSelectedSlug = requestedPost;
      return;
    }

    if (params.get("openFirst") === "1" && state.articlePosts.length) {
      state.articleMode = "editor";
      state.articleSelectedSlug = state.articlePosts[0].slug;
      return;
    }

    if (!state.articleSelectedSlug || !state.articlePosts.some((post) => post.slug === state.articleSelectedSlug)) {
      state.articleMode = "list";
      state.articleSelectedSlug = "";
    }
  }

  async function ensureArticlesData() {
    if (state.articleDataLoaded || state.articleDataLoading) return;

    state.articleDataLoading = true;
    state.articleDataError = "";
    renderArticlesWorkspace();

    try {
      let posts = [];
      const token = getStoredArticleToken();
      const settings = getStoredArticleSettings();

      if (token) {
        const files = await fetchJson(
          `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${encodeRepoPath(
            settings.contentRoot
          )}?ref=${encodeURIComponent(settings.branch)}`,
          token
        );

        const markdownFiles = files.filter((item) => item.type === "file" && /\.md$/i.test(item.name));
        posts = await Promise.all(
          markdownFiles.map(async (item) => {
            const detail = await fetchJson(
              `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${encodeRepoPath(
                item.path
              )}?ref=${encodeURIComponent(settings.branch)}`,
              token
            );
            const markdown = base64ToUtf8(detail.content || "");
            const parsed = parseFrontmatter(markdown);
            const title = parsed.attributes.title || slugifyFileName(item.name);
            const html = normalizeArticleBody(parsed.body);
            const plainText = stripHtml(html);
            const tags = Array.isArray(parsed.attributes.tags)
              ? parsed.attributes.tags
              : parsed.attributes.tags
              ? [parsed.attributes.tags]
              : [];
            const categories = Array.isArray(parsed.attributes.category)
              ? parsed.attributes.category
              : Array.isArray(parsed.attributes.categories)
              ? parsed.attributes.categories
              : parsed.attributes.category
              ? [parsed.attributes.category]
              : parsed.attributes.categories
              ? [parsed.attributes.categories]
              : [];

            return {
              slug: parsed.attributes.slug || slugifyFileName(item.name),
              path: detail.path,
              sha: detail.sha,
              title,
              publishDate: parsed.attributes.publishDate || parsed.attributes.date || new Date().toISOString(),
              updateDate: parsed.attributes.updateDate || parsed.attributes.lastmod || parsed.attributes.publishDate || "",
              draft: !!parsed.attributes.draft,
              status: parsed.attributes.draft ? "草稿" : "已发布",
              author: "XF",
              tags,
              categories,
              description: parsed.attributes.description || "",
              keywords: Array.isArray(parsed.attributes.keywords)
                ? parsed.attributes.keywords
                : parsed.attributes.keywords
                ? [parsed.attributes.keywords]
                : [],
              aliases: Array.isArray(parsed.attributes.aliases)
                ? parsed.attributes.aliases
                : parsed.attributes.aliases
                ? [parsed.attributes.aliases]
                : [],
              weight: parsed.attributes.weight || "",
              coverImage: parsed.attributes.cover || "",
              excerpt: plainText.slice(0, 90),
              html,
              plainText,
              outline: collectOutline(html),
              rawBody: parsed.body,
            };
          })
        );
      } else {
        posts = await fetchJson("./articles-index.json");
      }

      state.articlePosts = posts
        .map((post) => ({
          ...post,
          outline: Array.isArray(post.outline) ? post.outline : collectOutline(post.html || ""),
          plainText: post.plainText || stripHtml(post.html || ""),
          excerpt: post.excerpt || stripHtml(post.html || "").slice(0, 90),
          dateLabel: post.dateLabel || formatDate(post.date || ""),
          author: post.author || "XF",
          draft: typeof post.draft === "boolean" ? post.draft : post.status === "草稿",
          description: post.description || "",
          keywords: Array.isArray(post.keywords) ? post.keywords : [],
          aliases: Array.isArray(post.aliases) ? post.aliases : [],
          weight: post.weight || "",
          coverImage: post.coverImage || "",
          tags: Array.isArray(post.tags) ? post.tags : [],
          categories: Array.isArray(post.categories) ? post.categories : [],
          status:
            post.status || (typeof post.draft === "boolean" ? (post.draft ? "草稿" : "已发布") : "已发布"),
        }))
        .sort((left, right) => String(right.date).localeCompare(String(left.date)));
      state.articlePosts = state.articlePosts
        .map((post) => normalizeArticleRecord(post))
        .sort((left, right) => articleSortValue(right).localeCompare(articleSortValue(left)));
      state.articleDataLoaded = true;
      applyArticleQueryState();
      syncArticleQuery();
    } catch (error) {
      state.articleDataError = error instanceof Error ? error.message : "文章加载失败";
    } finally {
      state.articleDataLoading = false;
      renderArticlesWorkspace();
    }
  }

  function filteredArticlePosts() {
    const keyword = state.articleSearch.trim().toLowerCase();
    if (!keyword) return state.articlePosts;

    return state.articlePosts.filter((post) => {
      const haystack = [post.title, post.excerpt, post.slug, post.tags.join(" "), post.categories.join(" ")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }

  function articleListViewHtml() {
    const posts = filteredArticlePosts();
    const rows = posts.length
      ? posts
          .map(
            (post) => `
        <button class="halo-article-row" type="button" data-article-action="open-post" data-slug="${post.slug}">
          <span class="halo-article-checkbox"></span>
          <div class="halo-article-row-main">
            <strong>${escapeHtml(post.title)}</strong>
            <span>${escapeHtml(post.categories.join(" / ") || "默认分类")} · ${post.plainText.length} 字 · 评论 0</span>
            ${
              post.tags.length
                ? `<div class="halo-article-tag-row">${post.tags
                    .slice(0, 3)
                    .map((tag) => `<span class="halo-article-tag">${escapeHtml(tag)}</span>`)
                    .join("")}</div>`
                : ""
            }
          </div>
          <span class="halo-article-author">${escapeHtml(post.author)}</span>
          <span class="halo-article-status">${escapeHtml(post.status)}</span>
          <span class="halo-article-date">${escapeHtml(post.dateLabel)}</span>
          <span class="halo-article-more">...</span>
        </button>`
          )
          .join("")
      : `<div class="halo-article-empty">没有命中任何文章，换个关键词再试。</div>`;

    return `
      <section class="halo-article-list-view">
        <div class="halo-article-pagebar">
          <div class="halo-article-heading"><span class="halo-article-heading-icon">[]</span><h2>文章</h2></div>
          <div class="halo-article-page-actions">
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="分类入口已就位，下一步可以继续接真实分类管理。">分类</button>
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="标签入口已就位，下一步可以继续接真实标签管理。">标签</button>
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="回收站入口已预留，后面可接删除文章回收流程。">回收站</button>
            <button type="button" class="halo-dark-button" data-article-action="new-post">新建</button>
          </div>
        </div>
        <section class="halo-article-table">
          <div class="halo-article-filterbar">
            <label class="halo-article-search">
              <span class="halo-article-checkbox"></span>
              <input type="search" placeholder="输入关键词搜索" value="${escapeHtml(state.articleSearch)}" data-article-input="search" />
            </label>
            <div class="halo-article-filterchips">
              <span>状态：全部</span>
              <span>可见性：全部</span>
              <span>分类</span>
              <span>标签</span>
              <span>作者</span>
              <span>排序：默认</span>
            </div>
          </div>
          <div class="halo-article-tablebody">${rows}</div>
          <div class="halo-article-tablefoot">
            <span>共 ${posts.length} 项数据</span>
            <div class="halo-article-pagination">
              <button type="button" class="secondary-button small-button" disabled>‹</button>
              <button type="button" class="secondary-button small-button" disabled>›</button>
              <span>1 / 1</span>
              <span>20 条 / 页</span>
            </div>
          </div>
        </section>
      </section>`;
  }

  function articleEditorViewHtml(post) {
    const outline = post.outline.length
      ? post.outline
          .map(
            (item) => `<button type="button" class="halo-outline-item level-${item.level}" data-article-action="jump-outline" data-outline-text="${escapeHtml(
              item.text
            )}">${escapeHtml(item.text)}</button>`
          )
          .join("")
      : '<div class="halo-outline-empty">暂无大纲</div>';

    const detailPanel = `
      <div class="halo-article-meta-group">
        <label><span>Slug</span><input value="${escapeHtml(post.slug)}" readonly /></label>
        <label><span>发布日期</span><input value="${escapeHtml(post.dateLabel)}" readonly /></label>
      </div>
      <label><span>分类</span><input value="${escapeHtml(post.categories.join(" / ") || "默认分类")}" readonly /></label>
      <label><span>标签</span><input value="${escapeHtml(post.tags.join(" / ") || "未设置标签")}" readonly /></label>
      <label><span>附件</span><input value="图片素材、封面和媒体入口预留中" readonly /></label>
      <label><span>文章摘要</span><textarea class="summary-textarea" readonly>${escapeHtml(post.excerpt)}</textarea></label>`;

    return `
      <section class="halo-article-editor-view">
        <div class="halo-article-pagebar">
          <div class="halo-article-heading"><button type="button" class="halo-back-button" data-article-action="back-list">返回列表</button><span class="halo-article-heading-icon">[]</span><h2>文章</h2></div>
          <div class="halo-article-page-actions">
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="版本历史会在接入 GitHub 写回后继续补上。">版本历史</button>
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="当前是编辑模式，后续可以接前台预览链接。">预览</button>
            <button type="button" class="secondary-button small-button" data-article-action="notice" data-notice="当前编辑是本地浏览器态，接入 Token 后可继续做仓库保存。">保存</button>
            <button type="button" class="secondary-button small-button" data-article-action="switch-tab" data-tab="details">设置</button>
            <button type="button" class="halo-dark-button" data-article-action="notice" data-notice="发布按钮已对齐 Halo 位置，后面可以继续接入真实发布逻辑。">发布</button>
          </div>
        </div>
        <div class="halo-editor-toolbar">
          <button type="button" class="halo-toolbar-dot" title="文章操作"></button>
          <button type="button" data-article-action="exec" data-command="undo">↶</button>
          <button type="button" data-article-action="exec" data-command="redo">↷</button>
          <button type="button" data-article-action="exec" data-command="removeFormat">Tx</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="H1">H1</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="H2">H2</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="P">正文</button>
          <button type="button" data-article-action="exec" data-command="bold">B</button>
          <button type="button" data-article-action="exec" data-command="italic">I</button>
          <button type="button" data-article-action="exec" data-command="underline">U</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="BLOCKQUOTE">引</button>
          <button type="button" data-article-action="exec" data-command="insertUnorderedList">•</button>
          <button type="button" data-article-action="exec" data-command="insertOrderedList">1.</button>
          <button type="button" data-article-action="exec" data-command="justifyLeft">左</button>
          <button type="button" data-article-action="exec" data-command="justifyCenter">中</button>
          <button type="button" data-article-action="exec" data-command="justifyRight">右</button>
        </div>
        <div class="halo-editor-layout">
          <section class="halo-editor-main">
            <input class="halo-article-title-input" value="${escapeHtml(post.title)}" data-article-input="title" />
            <div class="halo-editor-divider"></div>
            <div class="halo-article-editor-canvas" contenteditable="true" data-article-input="body">${post.html}</div>
          </section>
          <aside class="halo-editor-sidebar">
            <div class="halo-editor-sidebar-tabs">
              <button type="button" class="${state.articleInspectorTab === "outline" ? "active" : ""}" data-article-action="switch-tab" data-tab="outline">大纲</button>
              <button type="button" class="${state.articleInspectorTab === "details" ? "active" : ""}" data-article-action="switch-tab" data-tab="details">详情</button>
            </div>
            <div class="halo-editor-sidebar-body">
              ${state.articleInspectorTab === "outline" ? outline : detailPanel}
            </div>
          </aside>
        </div>
      </section>`;
  }

  function articleDetailsPanelHtml(post) {
    return `
      <div class="halo-article-meta-group">
        <label><span>Slug</span><input value="${escapeHtml(post.slug)}" ${post.path ? "readonly" : ""} data-article-input="slug" /></label>
        <label><span>发布时间</span><input type="datetime-local" value="${escapeHtml(formatDateTimeLocal(post.publishDate || post.date))}" data-article-input="publishDate" /></label>
      </div>
      <label><span>分类</span><input value="${escapeHtml(post.categories.join(", "))}" placeholder="默认分类, 诗词" data-article-input="categories" /></label>
      <label><span>标签</span><input value="${escapeHtml(post.tags.join(", "))}" placeholder="Halo, 随笔" data-article-input="tags" /></label>
      <label><span>封面</span><input value="${escapeHtml(post.coverImage || "")}" placeholder="https://..." data-article-input="coverImage" /></label>
      <label><span>关键词</span><input value="${escapeHtml(post.keywords.join(", "))}" placeholder="关键词 1, 关键词 2" data-article-input="keywords" /></label>
      <label><span>别名</span><input value="${escapeHtml(post.aliases.join(", "))}" placeholder="/posts/demo" data-article-input="aliases" /></label>
      <label><span>权重</span><input type="number" value="${escapeHtml(String(post.weight || ""))}" placeholder="0" data-article-input="weight" /></label>
      <label><span>文章摘要</span><textarea class="summary-textarea" placeholder="这里会写入 frontmatter description" data-article-input="description">${escapeHtml(post.description || "")}</textarea></label>`;
  }

  function syncArticleEditorChrome(root, post) {
    if (!root || !post || state.articleMode !== "editor") return;

    const actionButtons = root.querySelectorAll(".halo-article-page-actions button");
    const saveButton = actionButtons[2];
    const publishButton = actionButtons[actionButtons.length - 1];
    const saveLabel = state.articleSavingAction === "save" ? "保存中..." : "保存";
    const publishLabel = state.articleSavingAction === "publish" ? "发布中..." : "发布";
    const isSaving = !!state.articleSavingAction;

    if (saveButton) {
      saveButton.dataset.articleAction = "save";
      saveButton.dataset.notice = "";
      saveButton.textContent = saveLabel;
      saveButton.disabled = isSaving;
    }

    if (publishButton) {
      publishButton.dataset.articleAction = "publish";
      publishButton.dataset.notice = "";
      publishButton.textContent = publishLabel;
      publishButton.disabled = isSaving;
    }

    if (state.articleInspectorTab === "details") {
      const sidebarBody = root.querySelector(".halo-editor-sidebar-body");
      if (sidebarBody) {
        sidebarBody.innerHTML = articleDetailsPanelHtml(post);
      }
    }
  }

  function renderArticlesWorkspace() {
    const main = document.querySelector(".console-main");
    if (!main) return;

    const root = main.querySelector(".halo-articles-root");
    if (!root) return;

    document.body.classList.toggle("halo-articles-active", document.body.classList.contains("view-articles"));
    document.body.classList.toggle("halo-articles-editor-open", state.articleMode === "editor");

    if (state.articleDataLoading) {
      root.innerHTML = `
        <section class="halo-article-loading">
          <div class="halo-article-heading"><span class="halo-article-heading-icon">[]</span><h2>文章</h2></div>
          <div class="halo-article-empty">正在加载 GitHub 仓库里的文章列表...</div>
        </section>`;
      return;
    }

    if (state.articleDataError) {
      root.innerHTML = `
        <section class="halo-article-loading">
          <div class="halo-article-heading"><span class="halo-article-heading-icon">[]</span><h2>文章</h2></div>
          <div class="halo-article-empty">
            <p>文章列表加载失败：${escapeHtml(state.articleDataError)}</p>
            <button type="button" class="primary-button small-button" data-article-action="retry">重新加载</button>
          </div>
        </section>`;
      return;
    }

    const post = currentArticle();
    const banner = [
      state.articleError ? `<div class="notice-banner error-banner halo-article-banner">${escapeHtml(state.articleError)}</div>` : "",
      state.articleNotice ? `<div class="notice-banner success-banner halo-article-banner">${escapeHtml(state.articleNotice)}</div>` : "",
    ].join("");

    root.innerHTML =
      banner +
      (state.articleMode === "editor" && post ? articleEditorViewHtml(post) : articleListViewHtml());
    syncArticleEditorChrome(root, post);
  }

  function updateArticleSnapshotFromDom() {
    const post = currentArticle();
    const root = document.querySelector(".halo-articles-root");
    if (!post || !root) return;

    const previousSlug = post.slug;
    const titleInput = root.querySelector(".halo-article-title-input");
    const editorCanvas = root.querySelector(".halo-article-editor-canvas");
    const slugInput = root.querySelector('[data-article-input="slug"]');
    const publishDateInput = root.querySelector('[data-article-input="publishDate"]');
    const categoriesInput = root.querySelector('[data-article-input="categories"]');
    const tagsInput = root.querySelector('[data-article-input="tags"]');
    const coverImageInput = root.querySelector('[data-article-input="coverImage"]');
    const keywordsInput = root.querySelector('[data-article-input="keywords"]');
    const aliasesInput = root.querySelector('[data-article-input="aliases"]');
    const weightInput = root.querySelector('[data-article-input="weight"]');
    const descriptionInput = root.querySelector('[data-article-input="description"]');
    if (titleInput) post.title = titleInput.value.trim() || "未命名文章";
    if (slugInput && !post.path) {
      post.slug = sanitizeArticleSlug(slugInput.value || previousSlug);
      if (state.articleSelectedSlug === previousSlug) {
        state.articleSelectedSlug = post.slug;
      }
    }
    if (publishDateInput?.value) {
      const parsedDate = new Date(publishDateInput.value);
      if (!Number.isNaN(parsedDate.getTime())) {
        post.publishDate = parsedDate.toISOString();
      }
    }
    if (categoriesInput) post.categories = csvToList(categoriesInput.value);
    if (tagsInput) post.tags = csvToList(tagsInput.value);
    if (coverImageInput) post.coverImage = coverImageInput.value.trim();
    if (keywordsInput) post.keywords = csvToList(keywordsInput.value);
    if (aliasesInput) post.aliases = csvToList(aliasesInput.value);
    if (weightInput) post.weight = weightInput.value.trim();
    if (descriptionInput) post.description = descriptionInput.value.trim();
    if (titleInput) post.title = titleInput.value.trim() || "未命名文章";
    if (editorCanvas) {
      post.html = editorBodyHtml(editorCanvas.innerHTML);
      post.plainText = editorCanvas.innerText.replace(/\s+/g, " ").trim();
      post.excerpt = (post.description || post.plainText).slice(0, 90);
      post.outline = collectOutline(post.html);
    }
    post.date = post.publishDate || post.date || new Date().toISOString();
    post.updateDate = new Date().toISOString();
    post.dateLabel = formatDate(post.updateDate || post.date);
    post.status = articleStatusText(!!post.draft);
  }

  async function saveArticleToGitHub(mode) {
    const post = currentArticle();
    if (!post || state.articleSavingAction) return;

    state.articleError = "";
    state.articleNotice = "";
    updateArticleSnapshotFromDom();

    const token = getStoredArticleToken();
    if (!token) {
      state.articleError = "未检测到 GitHub Token，请先在设置或登录区域完成仓库授权。";
      renderArticlesWorkspace();
      return;
    }

    post.slug = sanitizeArticleSlug(post.slug || post.title);
    if (state.articlePosts.some((item) => item !== post && item.slug === post.slug)) {
      state.articleError = `Slug ${post.slug} 已存在，请换一个。`;
      renderArticlesWorkspace();
      return;
    }

    const settings = getStoredArticleSettings();
    const targetPath = buildArticlePath(settings.contentRoot, post.slug);
    if (post.path && post.path !== targetPath) {
      state.articleError = "暂不支持直接修改已存在文章的 slug，请保持原 slug 或新建文章。";
      renderArticlesWorkspace();
      return;
    }

    state.articleSavingAction = mode;
    renderArticlesWorkspace();

    try {
      const desiredDraft = mode === "publish" ? false : !!post.draft;
      const publishDate = post.publishDate || post.date || new Date().toISOString();
      const updateDate = new Date().toISOString();
      const nextPost = normalizeArticleRecord({
        ...post,
        draft: desiredDraft,
        publishDate,
        updateDate,
        path: post.path || targetPath,
        html: post.html,
      });
      const markdown = buildArticleMarkdown(nextPost);
      const response = await fetchJson(
        `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${encodeRepoPath(targetPath)}`,
        token,
        {
          method: "PUT",
          body: {
            message: `${mode === "publish" ? "publish" : "save"} article: ${nextPost.slug}`,
            content: utf8ToBase64(markdown),
            branch: settings.branch,
            ...(post.sha ? { sha: post.sha } : {}),
          },
        }
      );

      const savedPost = normalizeArticleRecord({
        ...nextPost,
        sha: response?.content?.sha || nextPost.sha,
        path: response?.content?.path || targetPath,
      });
      Object.assign(post, savedPost);
      state.articlePosts = state.articlePosts
        .map((item) => (item === post ? savedPost : item))
        .sort((left, right) => articleSortValue(right).localeCompare(articleSortValue(left)));
      state.articleSelectedSlug = savedPost.slug;
      state.articleNotice = mode === "publish" ? "文章已发布并提交到 GitHub。" : "文章已保存到 GitHub。";
      state.articleError = "";
      syncArticleQuery();
    } catch (error) {
      state.articleError = error instanceof Error ? error.message : "文章保存失败";
    } finally {
      state.articleSavingAction = "";
      renderArticlesWorkspace();
    }
  }

  function runArticleCommand(command, value) {
    const editor = document.querySelector(".halo-article-editor-canvas");
    if (!editor) return;
    editor.focus();

    if (command === "formatBlock") {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }

    window.requestAnimationFrame(() => {
      updateArticleSnapshotFromDom();
      if (state.articleInspectorTab === "outline") renderArticlesWorkspace();
    });
  }

  function handleArticlesWorkspaceClick(event) {
    const trigger = event.target.closest("[data-article-action]");
    if (!trigger) return;

    const action = trigger.dataset.articleAction;
    if (action === "open-post") {
      setArticleMode("editor", trigger.dataset.slug || "");
      return;
    }

    if (action === "back-list") {
      setArticleMode("list");
      return;
    }

    if (action === "retry") {
      state.articleDataLoaded = false;
      state.articleDataError = "";
      ensureArticlesData();
      return;
    }

    if (action === "switch-tab") {
      state.articleInspectorTab = trigger.dataset.tab || "outline";
      updateArticleSnapshotFromDom();
      renderArticlesWorkspace();
      return;
    }

    if (action === "exec") {
      runArticleCommand(trigger.dataset.command, trigger.dataset.value || "");
      return;
    }

    if (action === "save" || action === "publish") {
      void saveArticleToGitHub(action);
      return;
    }

    if (action === "new-post") {
      const slug = `draft-${Date.now()}`;
      const post = normalizeArticleRecord({
        slug,
        path: "",
        draft: true,
        publishDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        title: "未命名文章",
        date: new Date().toISOString(),
        dateLabel: formatDate(new Date().toISOString()),
        status: "草稿",
        author: "XF",
        tags: ["Halo"],
        categories: ["默认分类"],
        excerpt: "",
        html: "<p></p>",
        plainText: "",
        outline: [],
        rawBody: "",
      });
      state.articlePosts.unshift(post);
      setArticleMode("editor", slug);
      return;
    }

    if (action === "notice") {
      state.articleNotice = trigger.dataset.notice || "功能入口已经预留好了。";
      renderArticlesWorkspace();
      return;
    }

    if (action === "jump-outline") {
      const text = trigger.dataset.outlineText;
      const heading = Array.from(document.querySelectorAll(".halo-article-editor-canvas h1, .halo-article-editor-canvas h2, .halo-article-editor-canvas h3")).find(
        (node) => node.textContent.trim() === text
      );
      if (heading) heading.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleArticlesWorkspaceInput(event) {
    const target = event.target;
    const inputType = target.dataset.articleInput;

    if (inputType === "search") {
      state.articleSearch = target.value;
      renderArticlesWorkspace();
      return;
    }

    if (
      inputType === "title" ||
      inputType === "body" ||
      inputType === "slug" ||
      inputType === "publishDate" ||
      inputType === "categories" ||
      inputType === "tags" ||
      inputType === "coverImage" ||
      inputType === "keywords" ||
      inputType === "aliases" ||
      inputType === "weight" ||
      inputType === "description"
    ) {
      updateArticleSnapshotFromDom();
    }
  }

  function ensureArticlesWorkspace() {
    const main = document.querySelector(".console-main");
    if (!main) return;

    const existing = main.querySelector(".halo-articles-root");
    const shouldActivate = document.body.classList.contains("view-articles");

    if (!shouldActivate) {
      document.body.classList.remove("halo-articles-active", "halo-articles-editor-open");
      existing?.remove();
      return;
    }

    let root = existing;
    if (!root) {
      root = document.createElement("section");
      root.className = "halo-articles-root";
      root.addEventListener("click", handleArticlesWorkspaceClick);
      root.addEventListener("input", handleArticlesWorkspaceInput);
      root.addEventListener("keydown", handleArticlesWorkspaceKeydown);
      main.appendChild(root);
    }

    renderArticlesWorkspace();
    ensureArticlesData();
  }

  function articleHistoryModalHtml(post) {
    if (!state.articleHistoryOpen) return "";

    const body = state.articleHistoryLoading
      ? '<div class="halo-history-empty">正在加载版本历史...</div>'
      : state.articleHistoryError
      ? `<div class="halo-history-empty">${escapeHtml(state.articleHistoryError)}</div>`
      : state.articleHistoryItems.length
      ? `<div class="halo-history-list">${state.articleHistoryItems
          .map(
            (item) => `
              <div class="halo-history-item">
                <div class="halo-history-meta">
                  <strong>${escapeHtml(item.message)}</strong>
                  <span>${escapeHtml(item.sha)} · ${escapeHtml(item.author)} · ${escapeHtml(item.date)}</span>
                </div>
                ${
                  item.url
                    ? `<a class="secondary-button small-button halo-history-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">打开提交</a>`
                    : ""
                }
              </div>`
          )
          .join("")}</div>`
      : '<div class="halo-history-empty">当前文章还没有可展示的提交记录。</div>';

    return `
      <div class="halo-history-backdrop" data-article-action="close-history">
        <section class="halo-history-modal" role="dialog" aria-modal="true" aria-label="版本历史">
          <div class="halo-history-header">
            <div>
              <h3>版本历史</h3>
              <p>${escapeHtml(post.title || post.slug)}</p>
            </div>
            <button type="button" class="secondary-button small-button" data-article-action="close-history">关闭</button>
          </div>
          ${body}
        </section>
      </div>`;
  }

  function articleEditorViewHtml(post) {
    const outline = post.outline.length
      ? post.outline
          .map(
            (item) => `<button type="button" class="halo-outline-item level-${item.level}" data-article-action="jump-outline" data-outline-text="${escapeHtml(
              item.text
            )}">${escapeHtml(item.text)}</button>`
          )
          .join("")
      : '<div class="halo-outline-empty">暂无大纲</div>';

    const detailPanel = `
      <div class="halo-article-meta-group">
        <label><span>Slug</span><input value="${escapeHtml(post.slug)}" readonly /></label>
        <label><span>发布时间</span><input value="${escapeHtml(post.dateLabel)}" readonly /></label>
      </div>
      <label><span>分类</span><input value="${escapeHtml(post.categories.join(" / ") || "默认分类")}" readonly /></label>
      <label><span>标签</span><input value="${escapeHtml(post.tags.join(" / ") || "未设置标签")}" readonly /></label>
      <label><span>附件</span><input value="图片素材、封面和媒体入口预留中" readonly /></label>
      <label><span>文章摘要</span><textarea class="summary-textarea" readonly>${escapeHtml(post.excerpt)}</textarea></label>`;

    const previewLabel = state.articlePreviewMode ? "编辑" : "预览";
    const toolbarDisabled = state.articlePreviewMode ? " disabled" : "";

    return `
      <section class="halo-article-editor-view">
        <div class="halo-article-pagebar">
          <div class="halo-article-heading"><button type="button" class="halo-back-button" data-article-action="back-list">返回列表</button><span class="halo-article-heading-icon">[]</span><h2>文章</h2></div>
          <div class="halo-article-page-actions">
            <button type="button" class="secondary-button small-button" data-article-action="toggle-history">版本历史</button>
            <button type="button" class="secondary-button small-button" data-article-action="toggle-preview">${previewLabel}</button>
            <button type="button" class="secondary-button small-button" data-article-action="save">保存</button>
            <button type="button" class="secondary-button small-button" data-article-action="switch-tab" data-tab="details">设置</button>
            <button type="button" class="halo-dark-button" data-article-action="publish">发布</button>
          </div>
        </div>
        <div class="halo-editor-toolbar">
          <button type="button" class="halo-toolbar-dot" title="文章操作"></button>
          <button type="button" data-article-action="exec" data-command="undo"${toolbarDisabled}>↶</button>
          <button type="button" data-article-action="exec" data-command="redo"${toolbarDisabled}>↷</button>
          <button type="button" data-article-action="exec" data-command="removeFormat"${toolbarDisabled}>Tx</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="H1"${toolbarDisabled}>H1</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="H2"${toolbarDisabled}>H2</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="P"${toolbarDisabled}>正文</button>
          <button type="button" data-article-action="exec" data-command="bold"${toolbarDisabled}>B</button>
          <button type="button" data-article-action="exec" data-command="italic"${toolbarDisabled}>I</button>
          <button type="button" data-article-action="exec" data-command="underline"${toolbarDisabled}>U</button>
          <button type="button" data-article-action="exec" data-command="formatBlock" data-value="BLOCKQUOTE"${toolbarDisabled}>引</button>
          <button type="button" data-article-action="exec" data-command="insertUnorderedList"${toolbarDisabled}>•</button>
          <button type="button" data-article-action="exec" data-command="insertOrderedList"${toolbarDisabled}>1.</button>
          <button type="button" data-article-action="exec" data-command="justifyLeft"${toolbarDisabled}>左</button>
          <button type="button" data-article-action="exec" data-command="justifyCenter"${toolbarDisabled}>中</button>
          <button type="button" data-article-action="exec" data-command="justifyRight"${toolbarDisabled}>右</button>
        </div>
        <div class="halo-editor-layout">
          <section class="halo-editor-main">
            <input class="halo-article-title-input" value="${escapeHtml(post.title)}" data-article-input="title" />
            <div class="halo-editor-divider"></div>
            <div class="halo-article-editor-canvas ${state.articlePreviewMode ? "is-preview" : ""}" contenteditable="${
              state.articlePreviewMode ? "false" : "true"
            }" data-article-input="body">${post.html}</div>
          </section>
          <aside class="halo-editor-sidebar">
            <div class="halo-editor-sidebar-tabs">
              <button type="button" class="${state.articleInspectorTab === "outline" ? "active" : ""}" data-article-action="switch-tab" data-tab="outline">大纲</button>
              <button type="button" class="${state.articleInspectorTab === "details" ? "active" : ""}" data-article-action="switch-tab" data-tab="details">详情</button>
            </div>
            <div class="halo-editor-sidebar-body">
              ${state.articleInspectorTab === "outline" ? outline : detailPanel}
            </div>
          </aside>
        </div>
        ${articleHistoryModalHtml(post)}
      </section>`;
  }

  function syncArticleEditorChrome(root, post) {
    if (!root || !post || state.articleMode !== "editor") return;

    const saveButton = root.querySelector('.halo-article-page-actions [data-article-action="save"]');
    const publishButton = root.querySelector('.halo-article-page-actions [data-article-action="publish"]');
    const previewButton = root.querySelector('.halo-article-page-actions [data-article-action="toggle-preview"]');
    const saveLabel = state.articleSavingAction === "save" ? "保存中..." : "保存";
    const publishLabel = state.articleSavingAction === "publish" ? "发布中..." : "发布";
    const isSaving = !!state.articleSavingAction;

    if (saveButton) {
      saveButton.textContent = saveLabel;
      saveButton.disabled = isSaving;
    }

    if (publishButton) {
      publishButton.textContent = publishLabel;
      publishButton.disabled = isSaving;
    }

    if (previewButton) {
      previewButton.textContent = state.articlePreviewMode ? "编辑" : "预览";
    }

    if (state.articleInspectorTab === "details") {
      const sidebarBody = root.querySelector(".halo-editor-sidebar-body");
      if (sidebarBody) {
        sidebarBody.innerHTML = articleDetailsPanelHtml(post);
      }
    }
  }

  function handleArticlesWorkspaceKeydown(event) {
    const editor = event.target.closest(".halo-article-editor-canvas");
    if (!editor || state.articlePreviewMode) return;

    if (event.key === "Backspace" || event.key === "Delete") {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const fragment = range.cloneContents();
        if (fragment.querySelector?.("img")) {
          event.preventDefault();
          range.deleteContents();
          updateArticleSnapshotFromDom();
        }
        return;
      }

      const imageNode =
        range.startContainer?.nodeType === Node.ELEMENT_NODE
          ? event.key === "Delete"
            ? range.startContainer.childNodes[range.startOffset]
            : range.startContainer.childNodes[range.startOffset - 1]
          : event.key === "Delete"
          ? range.startContainer?.nextSibling
          : range.startContainer?.previousSibling;

      if (imageNode?.nodeType === Node.ELEMENT_NODE && imageNode.tagName === "IMG") {
        event.preventDefault();
        imageNode.remove();
        updateArticleSnapshotFromDom();
      }
    }
  }

  function handleArticlesWorkspaceClick(event) {
    const trigger = event.target.closest("[data-article-action]");
    if (!trigger) return;

    const action = trigger.dataset.articleAction;
    if (action === "close-history") {
      state.articleHistoryOpen = false;
      renderArticlesWorkspace();
      return;
    }

    if (action === "toggle-preview") {
      state.articlePreviewMode = !state.articlePreviewMode;
      renderArticlesWorkspace();
      return;
    }

    if (action === "toggle-history") {
      const post = currentArticle();
      state.articleHistoryOpen = !state.articleHistoryOpen;
      if (state.articleHistoryOpen && post) {
        void loadArticleHistory(post);
      } else {
        renderArticlesWorkspace();
      }
      return;
    }

    if (action === "open-post") {
      setArticleMode("editor", trigger.dataset.slug || "");
      return;
    }

    if (action === "back-list") {
      setArticleMode("list");
      return;
    }

    if (action === "retry") {
      state.articleDataLoaded = false;
      state.articleDataError = "";
      ensureArticlesData();
      return;
    }

    if (action === "switch-tab") {
      state.articleInspectorTab = trigger.dataset.tab || "outline";
      updateArticleSnapshotFromDom();
      renderArticlesWorkspace();
      return;
    }

    if (action === "exec") {
      runArticleCommand(trigger.dataset.command, trigger.dataset.value || "");
      return;
    }

    if (action === "save" || action === "publish") {
      void saveArticleToGitHub(action);
      return;
    }

    if (action === "new-post") {
      const slug = `draft-${Date.now()}`;
      const post = normalizeArticleRecord({
        slug,
        path: "",
        draft: true,
        publishDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        title: "未命名文章",
        date: new Date().toISOString(),
        dateLabel: formatDate(new Date().toISOString()),
        status: "草稿",
        author: "XF",
        tags: ["Halo"],
        categories: ["默认分类"],
        excerpt: "",
        html: "<p></p>",
        plainText: "",
        outline: [],
        rawBody: "",
      });
      state.articlePosts.unshift(post);
      setArticleMode("editor", slug);
      return;
    }

    if (action === "notice") {
      state.articleNotice = trigger.dataset.notice || "功能入口已经预留好了。";
      renderArticlesWorkspace();
      return;
    }

    if (action === "jump-outline") {
      const text = trigger.dataset.outlineText;
      const heading = Array.from(
        document.querySelectorAll(".halo-article-editor-canvas h1, .halo-article-editor-canvas h2, .halo-article-editor-canvas h3")
      ).find((node) => node.textContent.trim() === text);
      if (heading) heading.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function ensureSidebar() {
    const sidebar = document.querySelector(".global-sidebar");
    if (!sidebar) return;

    const brandTitle = sidebar.querySelector(".brand-card h1");
    if (brandTitle) brandTitle.textContent = "Halo";

    const brandCard = sidebar.querySelector(".brand-card");
    if (brandCard && !sidebar.querySelector(".halo-sidebar-search")) {
      const search = document.createElement("button");
      search.type = "button";
      search.className = "halo-sidebar-search";
      search.innerHTML =
        '<span class="halo-sidebar-search-icon">⌕</span><span class="halo-sidebar-search-text">搜索</span><span class="halo-sidebar-search-shortcut">Ctrl+K</span>';
      brandCard.insertAdjacentElement("afterend", search);
    }

    const nav = sidebar.querySelector(".workspace-nav");
    if (!nav) return;

    Array.from(nav.querySelectorAll(".workspace-link")).forEach((button) => {
      const text = buttonText(button);
      if (text.includes("总览")) setButtonLabel(button, viewLabelMap.overview);
      if (text.includes("分类标签")) setButtonLabel(button, viewLabelMap.taxonomies);
      if (text.includes("前台设置")) setButtonLabel(button, viewLabelMap.frontend);
      if (text.includes("站点设置")) setButtonLabel(button, viewLabelMap.settings);
    });

    const articlesButton = findNavButton("文章");
    const frontendButton = findNavButton("主题/菜单");
    const settingsButton = findNavButton("设置");

    if (articlesButton) {
      const label = nav.querySelector('.halo-nav-section[data-section="content"]');
      if (!label) {
        const node = document.createElement("div");
        node.className = "halo-nav-section";
        node.dataset.section = "content";
        node.textContent = "内容";
        nav.insertBefore(node, articlesButton);
      }
    }

    if (frontendButton) {
      const label = nav.querySelector('.halo-nav-section[data-section="appearance"]');
      if (!label) {
        const node = document.createElement("div");
        node.className = "halo-nav-section";
        node.dataset.section = "appearance";
        node.textContent = "外观";
        nav.insertBefore(node, frontendButton);
      }
    }

    if (settingsButton) {
      const label = nav.querySelector('.halo-nav-section[data-section="system"]');
      if (!label) {
        const node = document.createElement("div");
        node.className = "halo-nav-section";
        node.dataset.section = "system";
        node.textContent = "系统";
        nav.insertBefore(node, settingsButton);
      }
    }

    if (articlesButton && !articlesButton.dataset.haloListReset) {
      articlesButton.dataset.haloListReset = "1";
      articlesButton.addEventListener("click", () => {
        state.articleMode = "list";
        state.articleSelectedSlug = "";
        state.articleNotice = "";
        syncArticleQuery();
        renderArticlesWorkspace();
      });
    }

    if (!sidebar.querySelector(".halo-sidebar-footer")) {
      const footer = document.createElement("div");
      footer.className = "halo-sidebar-footer";
      footer.innerHTML =
        '<div class="halo-sidebar-user">Xing Fu</div><div class="halo-sidebar-badge">超级管理员</div>';
      sidebar.appendChild(footer);
    }
  }

  function setViewClasses() {
    const body = document.body;
    const active = document.querySelector(".workspace-link.active");
    const title = buttonText(active);
    const knownViews = ["overview", "articles", "pages", "media", "taxonomies", "frontend", "settings"];

    knownViews.forEach((view) => body.classList.remove("view-" + view));

    if (title.includes("仪表盘") || title.includes("总览")) body.classList.add("view-overview");
    if (title.includes("文章")) body.classList.add("view-articles");
    if (title.includes("页面")) body.classList.add("view-pages");
    if (title.includes("附件")) body.classList.add("view-media");
    if (title.includes("分类")) body.classList.add("view-taxonomies");
    if (title.includes("主题") || title.includes("菜单")) body.classList.add("view-frontend");
    if (title.includes("设置")) body.classList.add("view-settings");

    const articlesView = body.classList.contains("view-articles");
    const hasSelectedPost = !!document.querySelector(".articles-grid .post-card.active");
    body.classList.toggle("articles-list-mode", articlesView && !hasSelectedPost);
    body.classList.toggle("articles-editor-mode", articlesView && hasSelectedPost);
  }

  function applyQueryView() {
    const params = new URLSearchParams(window.location.search);
    const targetView = params.get("view");
    const openFirst = params.get("openFirst") === "1";
    const connect = params.get("connect") === "1";

    if (!state.queryApplied && targetView) {
      const targetLabel = queryViewMap[targetView];
      const button = targetLabel && findNavButton(targetLabel);
      if (button) {
        state.queryApplied = true;
        button.click();
      }
    }

    if (!state.connectApplied && connect) {
      const connectButton = Array.from(document.querySelectorAll("button")).find((button) =>
        /连接|登录|Token/.test(buttonText(button))
      );
      if (connectButton) {
        state.connectApplied = true;
        connectButton.click();
      }
    }

    if (!state.openFirstApplied && openFirst && document.body.classList.contains("view-articles")) {
      const firstPost = document.querySelector(".post-list .post-card");
      if (firstPost) {
        state.openFirstApplied = true;
        firstPost.click();
      }
    }
  }

  function apply() {
    if (state.applying) return;
    state.applying = true;
    observer.disconnect();
    ensureSidebar();
    setViewClasses();
    applyQueryView();
    ensureArticlesWorkspace();
    observer.observe(document.body, { childList: true, subtree: true });
    state.applying = false;
  }

  const observer = new MutationObserver(() => apply());

  window.addEventListener("DOMContentLoaded", () => {
    apply();
    window.setTimeout(apply, 300);
    window.setTimeout(apply, 1200);
    window.setTimeout(apply, 2400);
  });
})();
