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
  };

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
