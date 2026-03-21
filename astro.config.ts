import { defineConfig } from "astro/config";
import { themeConfig } from "./src/theme.config.ts";
import tailwindcss from "@tailwindcss/vite";
import remarkWordsAndReadingTime from "./src/scripts/remark-words-reading-time.ts";
import rehypeExternalLinks from "./src/scripts/rehype-external-links.ts";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import sitemap from "@astrojs/sitemap";
import updateConfig from "./src/scripts/integration.ts";
import solidJs from "@astrojs/solid-js";

const siteUrl = new URL(themeConfig.site.url);
const siteBase =
  siteUrl.pathname === "/" ? "/" : `${siteUrl.pathname.replace(/\/$/, "")}/`;

export default defineConfig({
  site: themeConfig.site.url,
  base: siteBase,
  publicDir: "site-public",

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [updateConfig(), sitemap(), solidJs()],

  markdown: {
    remarkPlugins: [remarkWordsAndReadingTime],
    rehypePlugins: [
      rehypeExternalLinks,
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          test: ["h1", "h2", "h3", "h4"],
          behavior: "append",
          properties: {
            class: "header-anchor",
          },
          content: {
            type: "element",
            tagName: "span",
            properties: {
              className: ["icon-[tdesign--link]", "iconify-inline"],
            },
          },
        },
      ],
    ],
    shikiConfig: {
      theme: "one-light",
    },
  },
});
