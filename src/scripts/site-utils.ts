import type { CollectionEntry } from "astro:content";

const base =
  import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");

export function withBase(path: string): string {
  if (!path) return import.meta.env.BASE_URL;
  if (
    /^(?:[a-z]+:)?\/\//i.test(path) ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:") ||
    path.startsWith("#") ||
    path.startsWith("javascript:")
  ) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

export function postSlug(post: CollectionEntry<"blog">): string {
  return post.data.slug || post.id;
}

export function postPermalink(post: CollectionEntry<"blog">): string {
  return withBase(`/archives/${postSlug(post)}/`);
}
