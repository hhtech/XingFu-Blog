import rss from "@astrojs/rss";
import { themeConfig } from "@config";
import { getSortedCollection } from "@scripts/content-utils";
import { postPermalink } from "@scripts/site-utils";

export async function GET(context) {
  const posts = await getSortedCollection("blog");
  return rss({
    title: themeConfig.site.title,
    description: themeConfig.site.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description,
      link: postPermalink(post),
    })),
    customData: `<language>zh-cn</language>`,
  });
}
