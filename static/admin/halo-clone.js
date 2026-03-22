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
    overview: "overview",
    dashboard: "overview",
    articles: "articles",
    posts: "articles",
    pages: "pages",
    media: "media",
    settings: "settings",
  };

  const demoPosts = [
    {
      slug: "2222",
      title: "测试",
      publishDate: "2026-03-20T03:06:00.000Z",
      updateDate: "2026-03-20T03:06:00.000Z",
      draft: false,
      categories: [],
      tags: [],
      summary: "123",
      body: "123",
    },
    {
      slug: "sui-xiang-lu",
      title: "随想录",
      publishDate: "2025-08-14 01:11:53+08:00",
      updateDate: "2025-08-14 01:11:53+08:00",
      draft: false,
      categories: [],
      tags: [],
      summary:
        "曾以侠客情怀，入道教，随心而行 无拘无束 追求大自在境界。后知后觉，道法不可直中取，方可悟道。后又尝试，以佛法入道，以无欲无求，进道家自然，道教追求本心本源。",
      body:
        "曾以侠客情怀，入道教，随心而行 无拘无束 追求大自在境界。后知后觉，道法不可直中取，方可悟道。后又尝试，以佛法入道，以无欲无求，进道家自然，道教追求本心本源。以内心平静，悟道无为，然后形懒。苟延残喘之际，深受儒家，中庸儒化。然浑浑噩噩。\n\n后了解王阳明，以内心思想作为主观行动指导，本质还是追求自由。\n\n后知思想过度局限，希望以学科知识作为基础，学习以哲学、经济学、法学、教育学、文学、历史学、理学、工学、农学、医学、军事学、管理学、艺术学等入手。",
    },
    {
      slug: "fa-tian-xiang-di",
      title: "法天象地",
      publishDate: "2025-07-31T16:51:00.000Z",
      updateDate: "2025-07-31T16:51:00.000Z",
      draft: false,
      categories: [],
      tags: [],
      summary: "12345678",
      body: "12345678",
    },
    {
      slug: "wei-ming-ming-wen-zhang",
      title: "大山",
      publishDate: "2025-07-15 23:07:34+08:00",
      updateDate: "2026-03-21 00:00:00+08:00",
      draft: false,
      categories: [],
      tags: [],
      summary:
        "是谁挡住了你前进的脚步，是那故步自封的大山，是那义无反顾走进大山的你。",
      body:
        "是谁挡住了你前进的脚步，是那故步自封的大山，是那义无反顾走进大山的你。\n\n唐多令·绿春别\n\n云矮压茶洲，藤深掩竹楼。\n恰相逢、未暖分携酒。\n糯酒才温眉又皱，风过处、说离愁。\n婚字怎轻谋？医贫字未休。\n怕春衫、难载温柔。\n莫道无衣同白首，山月证、共行舟！",
    },
    {
      slug: "shui-diao-ge-tou-chong-shang-jing-gang-shan",
      title: "水调歌头·重上井冈山",
      publishDate: "2025-05-24 22:14:11+08:00",
      updateDate: "2025-05-24 22:14:11+08:00",
      draft: false,
      categories: [],
      tags: [],
      summary:
        "水调歌头·重上井冈山，久有凌云志，重上井冈山。千里来寻故地，旧貌变新颜。",
      body:
        "水调歌头·重上井冈山\n\n久有凌云志，重上井冈山。\n千里来寻故地，旧貌变新颜。\n到处莺歌燕舞，更有潺潺流水，高路入云端。\n过了黄洋界，险处不须看。\n风雷动，旌旗奋，是人寰。\n三十八年过去，弹指一挥间。可上九天揽月，可下五洋捉鳖，谈笑凯歌还。\n世上无难事，只要肯登攀。",
    },
    {
      slug: "fu-sheng-ji-du-qiu-liang",
      title: "浮生几度秋凉",
      publishDate: "2025-05-24 21:26:53+08:00",
      updateDate: "2025-05-24 21:26:53+08:00",
      draft: false,
      categories: [],
      tags: [],
      summary:
        "《戚氏·浮生几度秋凉》 乱红舞，跌撞檐角叩朱栏。稚子懵腾，仰看粉雪扑泥坛。",
      body:
        "《戚氏·浮生几度秋凉》\n\n乱红舞，跌撞檐角叩朱栏。稚子懵腾，仰看粉雪扑泥坛。谁怜？灶烟残，蛩声碎月漏瓢箪。\n\n征轮摇梦，童嬉未解，异乡草色初看。正蜂围蝶阵，槐荫露井，笑语频传。\n\n骤雨打落花冠。蝉蜕委地，剩有薄衣寒。韶光贱、秤星移斗，废纸成山。泪偷潸。芥蒂暗结眉弯。",
    },
    {
      slug: "ce-shi",
      title: "欲买桂花同载酒",
      publishDate: "2025-05-11 20:42:27+08:00",
      updateDate: "2025-05-11 20:42:27+08:00",
      draft: false,
      categories: ["默认分类"],
      tags: ["Halo"],
      summary:
        "人生乐事，吃饭，睡觉，拉屎，爽。《玉蝴蝶·重过黄鹤矶》楚江暮雨初收，寒苇锁汀洲。",
      body:
        "人生乐事，吃饭，睡觉，拉屎，爽。\n\n《玉蝴蝶·重过黄鹤矶》\n\n楚江暮雨初收，寒苇锁汀洲。廿载萍踪，青衫又过南楼。系兰舟、霜侵短鬓，惊节序、月近中秋。立矶头，断鸿声里，谁记曾游？\n\n凝眸。苍烟漫处，少年箫鼓，尽付东流。故友难寻，空教浊酒渍新愁。",
    },
    {
      slug: "shi-nian-zhi-yue",
      title: "十年之约",
      publishDate: "2025-05-01 21:36:00+08:00",
      updateDate: "2025-05-01 21:36:00+08:00",
      draft: false,
      categories: ["默认分类"],
      tags: ["Halo"],
      summary: "奔赴他人的十年之约 https://foreverblog.cn/go.html",
      body: "奔赴他人的十年之约\n\nhttps://foreverblog.cn/go.html",
    },
  ].map((post, index) => ({
    ...post,
    visits: 128 + index * 71,
    comments: (index * 2 + 1) % 9,
  }));

  const state = {
    queryApplied: false,
    openFirstApplied: false,
    connectApplied: false,
    applying: false,
    requestedView: null,
    demoMode: "list",
    demoSelectedSlug: "ce-shi",
    demoSearch: "",
    demoTab: "outline",
  };

  function buttonText(button) {
    return button ? button.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(value) {
    if (!value) return "未设置";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDateTime(value) {
    if (!value) return "未设置";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  function normalizeView(text) {
    if (!text) return null;
    if (text.includes("文章")) return "articles";
    if (text.includes("仪表盘") || text.includes("总览")) return "overview";
    if (text.includes("页面")) return "pages";
    if (text.includes("附件")) return "media";
    if (text.includes("分类")) return "taxonomies";
    if (text.includes("主题") || text.includes("菜单")) return "frontend";
    if (text.includes("设置")) return "settings";
    return null;
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

  function activateWorkspace(label) {
    const buttons = Array.from(document.querySelectorAll(".workspace-link"));
    buttons.forEach((button) => {
      const text = buttonText(button);
      const isMatch =
        text.includes(label) ||
        (label === "仪表盘" && text.includes("总览")) ||
        (label === "分类/标签" && text.includes("分类标签")) ||
        (label === "主题/菜单" && text.includes("前台设置")) ||
        (label === "设置" && text.includes("站点设置"));
      button.classList.toggle("active", isMatch);
      button.classList.toggle("halo-force-active", isMatch);
      button.style.background = isMatch ? "#eef4ff" : "";
      button.style.borderColor = isMatch ? "#dbe7ff" : "";
      button.style.color = isMatch ? "#1d4ed8" : "";
    });

    const heading = document.querySelector(".workspace-header h2");
    if (heading) heading.textContent = label;
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

    if (state.requestedView === "articles" && articlesButton) {
      Array.from(nav.querySelectorAll(".workspace-link")).forEach((button) => {
        const isActive = button === articlesButton;
        button.classList.toggle("halo-force-active", isActive);
        if (!isActive) button.classList.remove("active");
        button.style.background = isActive ? "#eef4ff" : "";
        button.style.borderColor = isActive ? "#dbe7ff" : "";
        button.style.color = isActive ? "#1d4ed8" : "";
      });
    }

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
    const activeTitle =
      state.requestedView === "articles"
        ? viewLabelMap.articles
        : buttonText(document.querySelector(".workspace-link.active"));
    const knownViews = [
      "overview",
      "articles",
      "pages",
      "media",
      "taxonomies",
      "frontend",
      "settings",
    ];

    knownViews.forEach((view) => body.classList.remove("view-" + view));

    if (activeTitle.includes("仪表盘") || activeTitle.includes("总览")) body.classList.add("view-overview");
    if (activeTitle.includes("文章")) body.classList.add("view-articles");
    if (activeTitle.includes("页面")) body.classList.add("view-pages");
    if (activeTitle.includes("附件")) body.classList.add("view-media");
    if (activeTitle.includes("分类")) body.classList.add("view-taxonomies");
    if (activeTitle.includes("主题") || activeTitle.includes("菜单")) body.classList.add("view-frontend");
    if (activeTitle.includes("设置")) body.classList.add("view-settings");

    const articlesView = body.classList.contains("view-articles");
    const hasSelectedPost =
      body.classList.contains("halo-demo-active") && state.demoMode === "editor"
        ? true
        : !!document.querySelector(".articles-grid .post-card.active");
    body.classList.toggle("articles-list-mode", articlesView && !hasSelectedPost);
    body.classList.toggle("articles-editor-mode", articlesView && hasSelectedPost);
  }

  function ensureEditorActions() {
    const editorTopbar = document.querySelector(".articles-grid .editor-topbar");
    if (!editorTopbar) return;

    let actionBar = editorTopbar.querySelector(".halo-editor-actions");
    if (!actionBar) {
      actionBar = document.createElement("div");
      actionBar.className = "halo-editor-actions";
      actionBar.innerHTML = [
        '<button type="button" class="halo-action-button" data-action="history">版本历史</button>',
        '<button type="button" class="halo-action-button" data-action="preview">预览</button>',
        '<button type="button" class="halo-action-button" data-action="save">保存</button>',
        '<button type="button" class="halo-action-button" data-action="settings">设置</button>',
        '<button type="button" class="halo-action-button halo-publish-button" data-action="publish">发布</button>',
      ].join("");
      editorTopbar.appendChild(actionBar);
    }

    const saveButton = document.querySelector(".inspector-pane .primary-button.wide-button");
    const previewButton = Array.from(document.querySelectorAll(".mode-button")).find((button) =>
      buttonText(button).includes("预览")
    );
    const settingsButton = findNavButton("设置");
    const draftCheckbox = document.querySelector('.inspector-pane input[type="checkbox"]');

    actionBar.querySelector('[data-action="history"]').disabled = true;
    actionBar.querySelector('[data-action="preview"]').onclick = () => previewButton && previewButton.click();
    actionBar.querySelector('[data-action="save"]').onclick = () => saveButton && saveButton.click();
    actionBar.querySelector('[data-action="settings"]').onclick = () => settingsButton && settingsButton.click();
    actionBar.querySelector('[data-action="publish"]').onclick = () => {
      if (draftCheckbox && draftCheckbox.checked) draftCheckbox.click();
      if (saveButton) saveButton.click();
    };
  }

  function ensureInspectorTabs() {
    const inspector = document.querySelector(".articles-grid .inspector-pane");
    if (!inspector) return;

    if (!inspector.querySelector(".halo-inspector-tabs")) {
      const tabs = document.createElement("div");
      tabs.className = "halo-inspector-tabs";
      tabs.innerHTML =
        '<button type="button" class="halo-inspector-tab active" data-tab="outline">大纲</button><button type="button" class="halo-inspector-tab" data-tab="details">详情</button>';
      inspector.insertBefore(tabs, inspector.firstChild);

      const outline = document.createElement("div");
      outline.className = "halo-inspector-outline";
      outline.textContent = "暂无大纲";
      inspector.appendChild(outline);

      tabs.addEventListener("click", (event) => {
        const target = event.target.closest(".halo-inspector-tab");
        if (!target) return;
        const mode = target.dataset.tab;
        inspector.classList.toggle("halo-show-details", mode === "details");
        inspector.classList.toggle("halo-show-outline", mode === "outline");
        tabs.querySelectorAll(".halo-inspector-tab").forEach((button) => {
          button.classList.toggle("active", button === target);
        });
      });

      inspector.classList.add("halo-show-details");
    }
  }

  function shouldAutoDefaultArticles() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "1") return false;
    if (document.querySelector(".articles-grid")) return false;
    const mainText = document.querySelector(".console-main")?.textContent || "";
    return /GitHub|Token|仓库/.test(mainText);
  }

  function shouldUseDemoArticles() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "1") return false;
    if (state.requestedView !== "articles") return false;
    if (document.querySelector(".articles-grid")) return false;
    const mainText = document.querySelector(".console-main")?.textContent || "";
    return /GitHub|Token|仓库/.test(mainText);
  }

  function getFilteredPosts() {
    const keyword = state.demoSearch.trim().toLowerCase();
    if (!keyword) return demoPosts;
    return demoPosts.filter((post) =>
      [post.title, post.summary, post.slug, post.tags.join(" "), post.categories.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }

  function getSelectedPost() {
    return demoPosts.find((post) => post.slug === state.demoSelectedSlug) || demoPosts[0];
  }

  function updateDemoUrl(openFirst) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "articles");
    if (openFirst) url.searchParams.set("openFirst", "1");
    else url.searchParams.delete("openFirst");
    window.history.replaceState({}, "", url);
  }

  function buildOutline(post) {
    const segments = [post.title]
      .concat(
        post.body
          .split(/[\n。！？]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 4)
      )
      .slice(0, 4);

    return segments
      .map(
        (item, index) =>
          `<div class="halo-demo-outline-item"><span>${String(index + 1).padStart(
            2,
            "0"
          )}</span><strong>${escapeHtml(item)}</strong></div>`
      )
      .join("");
  }

  function renderTagList(list) {
    if (!list.length) return '<span class="halo-demo-pill muted">未设置</span>';
    return list.map((item) => `<span class="halo-demo-pill">${escapeHtml(item)}</span>`).join("");
  }

  function renderDemoList() {
    const posts = getFilteredPosts();
    const rows = posts
      .map(
        (post) => `
          <button class="halo-demo-row" type="button" data-post-slug="${escapeHtml(post.slug)}">
            <div class="halo-demo-row-main">
              <strong>${escapeHtml(post.title)}</strong>
              <span>${escapeHtml(post.summary || "暂无摘要")}</span>
            </div>
            <div class="halo-demo-row-cell">
              <span class="halo-demo-status ${post.draft ? "draft" : "published"}">${
                post.draft ? "草稿" : "已发布"
              }</span>
            </div>
            <div class="halo-demo-row-cell halo-demo-meta-cell">
              <strong>${escapeHtml(formatDate(post.updateDate || post.publishDate))}</strong>
              <span>最近更新</span>
            </div>
            <div class="halo-demo-row-cell halo-demo-meta-cell">
              <strong>${post.visits}</strong>
              <span>${post.comments} 条评论</span>
            </div>
          </button>
        `
      )
      .join("");

    return `
      <div class="halo-demo-pagehead">
        <div class="halo-demo-pagecopy">
          <span class="halo-demo-pageeyebrow">Content</span>
          <h2>文章</h2>
        </div>
        <div class="halo-demo-pageactions">
          <button type="button" class="halo-demo-action">分类</button>
          <button type="button" class="halo-demo-action">标签</button>
          <button type="button" class="halo-demo-action">回收站</button>
          <button type="button" class="halo-demo-action primary">新建</button>
        </div>
      </div>
      <section class="halo-demo-surface">
        <div class="halo-demo-toolbar">
          <label class="halo-demo-search">
            <input
              class="halo-demo-search-input"
              type="search"
              placeholder="输入关键词搜索"
              value="${escapeHtml(state.demoSearch)}"
            />
          </label>
          <div class="halo-demo-filterset halo-demo-filterlinks">
            <button type="button" class="halo-demo-filter halo-demo-filterlink">状态</button>
            <button type="button" class="halo-demo-filter halo-demo-filterlink">可见性</button>
            <button type="button" class="halo-demo-filter halo-demo-filterlink">分类</button>
            <button type="button" class="halo-demo-filter halo-demo-filterlink">标签</button>
            <button type="button" class="halo-demo-filter halo-demo-filterlink">作者</button>
            <button type="button" class="halo-demo-filter halo-demo-filterlink">排序</button>
          </div>
        </div>
        <div class="halo-demo-table">
          <div class="halo-demo-tablehead">
            <span>文章</span>
            <span>状态</span>
            <span>最近更新</span>
            <span>访问 / 评论</span>
          </div>
          <div class="halo-demo-tablebody">
            ${rows || '<div class="halo-demo-empty">没有找到匹配的文章。</div>'}
          </div>
        </div>
      </section>
      <div class="halo-demo-powered">Powered by Halo</div>
    `;
  }

  function renderDemoEditor() {
    const post = getSelectedPost();
    const editorText = escapeHtml(post.body)
      .replace(/\n{2,}/g, "\n\n")
      .replace(/\n/g, "<br>");
    const metaChips = []
      .concat(post.categories.map((item) => `分类 · ${item}`))
      .concat(post.tags.map((item) => `标签 · ${item}`))
      .concat(post.draft ? ["状态 · 草稿"] : ["状态 · 已发布"])
      .slice(0, 4)
      .map((item) => `<span class="halo-demo-chip">${escapeHtml(item)}</span>`)
      .join("");

    return `
      <div class="halo-demo-pagehead">
        <div class="halo-demo-pagecopy">
          <span class="halo-demo-pageeyebrow">Content</span>
          <h2>文章</h2>
        </div>
        <div class="halo-demo-pageactions">
          <button type="button" class="halo-demo-action">版本历史</button>
          <button type="button" class="halo-demo-action">预览</button>
          <button type="button" class="halo-demo-action">保存</button>
          <button type="button" class="halo-demo-action">设置</button>
          <button type="button" class="halo-demo-action primary">发布</button>
        </div>
      </div>
      <section class="halo-demo-editorlayout">
        <div class="halo-demo-editorcard">
          <div class="halo-demo-editorheader">
            <div class="halo-demo-breadcrumb">
              <button type="button" class="halo-demo-back" data-demo-nav="list">文章</button>
              <span>/</span>
              <span>编辑</span>
            </div>
            <input class="halo-demo-titleinput" type="text" value="${escapeHtml(post.title)}" />
            <div class="halo-demo-chiprow">
              ${metaChips}
            </div>
            <div class="halo-demo-submeta">
              <span>发布时间 ${escapeHtml(formatDateTime(post.publishDate))}</span>
              <span>更新于 ${escapeHtml(formatDateTime(post.updateDate || post.publishDate))}</span>
              <span>访问 ${post.visits}</span>
            </div>
          </div>
          <div class="halo-demo-formatbar">
            <button type="button" class="halo-demo-formatbutton">T</button>
            <button type="button" class="halo-demo-formatbutton">H2</button>
            <button type="button" class="halo-demo-formatbutton">B</button>
            <button type="button" class="halo-demo-formatbutton">I</button>
            <button type="button" class="halo-demo-formatbutton">"</button>
            <button type="button" class="halo-demo-formatbutton">表格</button>
            <button type="button" class="halo-demo-formatbutton">图片</button>
            <button type="button" class="halo-demo-formatbutton halo-demo-formatspacer">Markdown</button>
          </div>
          <div class="halo-demo-canvas">
            <div class="halo-demo-paper">
              <div class="halo-demo-papercontent" contenteditable="true">${editorText}</div>
            </div>
          </div>
        </div>
        <aside class="halo-demo-sidecard">
          <div class="halo-demo-sidetabs">
            <button
              type="button"
              class="halo-demo-sidetab ${state.demoTab === "outline" ? "active" : ""}"
              data-demo-tab="outline"
            >
              大纲
            </button>
            <button
              type="button"
              class="halo-demo-sidetab ${state.demoTab === "details" ? "active" : ""}"
              data-demo-tab="details"
            >
              详情
            </button>
          </div>
          <div class="halo-demo-sidepanel ${state.demoTab === "outline" ? "active" : ""}">
            ${buildOutline(post)}
          </div>
          <div class="halo-demo-sidepanel ${state.demoTab === "details" ? "active" : ""}">
            <div class="halo-demo-detailgroup">
              <span class="halo-demo-detaillabel">文章摘要</span>
              <div class="halo-demo-detailvalue">${escapeHtml(post.summary || "暂无摘要")}</div>
            </div>
            <div class="halo-demo-detailgrid">
              <div class="halo-demo-detailgroup">
                <span class="halo-demo-detaillabel">发布时间</span>
                <div class="halo-demo-detailvalue">${escapeHtml(formatDate(post.publishDate))}</div>
              </div>
              <div class="halo-demo-detailgroup">
                <span class="halo-demo-detaillabel">最近更新</span>
                <div class="halo-demo-detailvalue">${escapeHtml(formatDate(post.updateDate || post.publishDate))}</div>
              </div>
            </div>
            <div class="halo-demo-detailgroup">
              <span class="halo-demo-detaillabel">分类</span>
              <div class="halo-demo-pillwrap">${renderTagList(post.categories)}</div>
            </div>
            <div class="halo-demo-detailgroup">
              <span class="halo-demo-detaillabel">标签</span>
              <div class="halo-demo-pillwrap">${renderTagList(post.tags)}</div>
            </div>
            <div class="halo-demo-detailgroup">
              <span class="halo-demo-detaillabel">Slug</span>
              <div class="halo-demo-detailvalue mono">${escapeHtml(post.slug)}</div>
            </div>
          </div>
        </aside>
      </section>
      <div class="halo-demo-powered">Powered by Halo</div>
    `;
  }

  function bindDemoEvents(root) {
    if (root.dataset.bound === "1") return;
    root.dataset.bound = "1";

    root.addEventListener("click", (event) => {
      const row = event.target.closest("[data-post-slug]");
      if (row) {
        state.demoSelectedSlug = row.dataset.postSlug;
        state.demoMode = "editor";
        state.demoTab = "outline";
        updateDemoUrl(true);
        apply();
        return;
      }

      const back = event.target.closest('[data-demo-nav="list"]');
      if (back) {
        state.demoMode = "list";
        updateDemoUrl(false);
        apply();
        return;
      }

      const tab = event.target.closest("[data-demo-tab]");
      if (tab) {
        state.demoTab = tab.dataset.demoTab;
        apply();
      }
    });

    root.addEventListener("input", (event) => {
      const search = event.target.closest(".halo-demo-search-input");
      if (search) {
        state.demoSearch = search.value;
        apply();
      }
    });
  }

  function ensureDemoView() {
    const main = document.querySelector(".console-main");
    if (!main) return;

    const shouldDemo = shouldUseDemoArticles();
    let root = main.querySelector(".halo-demo-root");

    if (!shouldDemo) {
      if (root) root.remove();
      document.body.classList.remove("halo-demo-active");
      return;
    }

    document.body.classList.add("halo-demo-active");

    if (!root) {
      root = document.createElement("section");
      root.className = "halo-demo-root";
      main.appendChild(root);
      bindDemoEvents(root);
    }

    root.innerHTML = state.demoMode === "editor" ? renderDemoEditor() : renderDemoList();
  }

  function applyQueryView() {
    const params = new URLSearchParams(window.location.search);
    const targetView = params.get("view");
    const openFirst = params.get("openFirst") === "1";
    const connect = params.get("connect") === "1";

    if (!state.queryApplied) {
      if (targetView && queryViewMap[targetView] === "articles") {
        state.requestedView = "articles";
        activateWorkspace(viewLabelMap.articles);
      } else if (!targetView && shouldAutoDefaultArticles()) {
        state.requestedView = "articles";
        activateWorkspace(viewLabelMap.articles);
      }
      state.queryApplied = true;
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

    if (!state.openFirstApplied && openFirst && state.requestedView === "articles") {
      state.demoMode = "editor";
      state.demoSelectedSlug = "ce-shi";
      state.openFirstApplied = true;
    }
  }

  function apply() {
    if (state.applying) return;
    state.applying = true;
    observer.disconnect();
    ensureSidebar();
    applyQueryView();
    ensureEditorActions();
    ensureInspectorTabs();
    ensureDemoView();
    setViewClasses();
    observer.observe(document.body, { childList: true, subtree: true });
    state.applying = false;
  }

  const observer = new MutationObserver(() => apply());

  document.addEventListener(
    "click",
    (event) => {
      const navButton = event.target.closest(".workspace-link");
      if (!navButton) return;
      const view = normalizeView(buttonText(navButton));
      state.requestedView = view === "articles" ? "articles" : null;
      if (view !== "articles") {
        state.demoMode = "list";
      }
      window.setTimeout(apply, 0);
    },
    true
  );

  window.addEventListener("DOMContentLoaded", () => {
    apply();
    window.setTimeout(apply, 300);
    window.setTimeout(apply, 1200);
    window.setTimeout(apply, 2400);
  });
})();
