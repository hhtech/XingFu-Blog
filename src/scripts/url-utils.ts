import { withBase } from "./site-utils";

export function getCategoryUrl(category: string): string {
  return withBase(`/categories/${encodeURIComponent(category)}`);
}

export function getTagUrl(tag: string): string {
  return withBase(`/tags/${encodeURIComponent(tag)}`);
}
