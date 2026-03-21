document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("post-content");
  const toc = document.getElementById("toc");
  const toTop = document.querySelector(".to-top");
  const publishTime = document.getElementById("post-publish-time");
  const updateTime = document.getElementById("post-update-time");
  const wordCount = document.getElementById("post-wordcount");
  const readTime = document.getElementById("post-readtime");
  const timeTips = document.getElementById("post-time-tips-span");

  if (content) {
    const text = (content.textContent || "").replace(/\s+/g, "");
    const count = Array.from(text).length;

    if (wordCount) {
      wordCount.textContent = `${count} 字`;
    }

    if (readTime) {
      readTime.textContent = `${Math.max(1, Math.ceil(count / 400))} 分钟`;
    }

    if (timeTips && publishTime) {
      const publishedAt = new Date(publishTime.dateTime || publishTime.textContent || Date.now());
      const updatedAt = updateTime
        ? new Date(updateTime.dateTime || updateTime.textContent || publishedAt)
        : publishedAt;
      const reference = Number.isNaN(updatedAt.getTime()) ? publishedAt : updatedAt;
      const now = new Date();
      const diffDays = Math.floor((now - reference) / 86400000);

      if (diffDays >= 365) {
        timeTips.textContent = `本文最后更新于 ${diffDays} 天前，部分内容可能已经发生变化，请注意甄别。`;
      } else if (diffDays >= 90) {
        timeTips.textContent = `本文发布已有 ${diffDays} 天，阅读时请结合当前情况判断。`;
      } else {
        const publishedDays = Math.max(0, Math.floor((now - publishedAt) / 86400000));
        timeTips.textContent = `本文发布于 ${publishedDays} 天前。`;
      }
    }

    if (toc) {
      const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4")).filter(
        (heading) => (heading.textContent || "").trim().length > 0,
      );

      if (headings.length === 0) {
        toc.parentElement?.remove();
      } else {
        const items = headings.map((heading, index) => {
          if (!heading.id) {
            heading.id = `toc-heading-${index + 1}`;
          }

          const item = document.createElement("div");
          item.className = `toc-item-level-${heading.tagName.substring(1)}`;

          const link = document.createElement("a");
          link.href = `#${heading.id}`;
          link.textContent = heading.textContent.trim();
          item.appendChild(link);
          toc.appendChild(item);

          return { heading, item };
        });

        const syncActiveToc = () => {
          const current = items
            .filter(({ heading }) => heading.getBoundingClientRect().top <= 140)
            .slice(-1)[0];

          items.forEach(({ item }) => item.classList.remove("active"));
          if (current) {
            current.item.classList.add("active");
          }
        };

        window.addEventListener("scroll", syncActiveToc, { passive: true });
        syncActiveToc();
      }
    }
  }

  if (toTop) {
    const syncToTop = () => {
      if (window.scrollY > 320) {
        toTop.classList.add("active");
      } else {
        toTop.classList.remove("active");
      }
    };

    window.addEventListener("scroll", syncToTop, { passive: true });
    syncToTop();
  }
});
