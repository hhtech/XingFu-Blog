import type { ImageMetadata } from "astro";

const images = import.meta.glob<{ default: ImageMetadata }>("src/config/images/**");

export function getImportImage(imagePath: string) {
  const key = Object.keys(images).find((item) => item.endsWith(`/${imagePath}`));
  if (!key) {
    throw new Error(`Image "${imagePath}" was not found in src/config/images`);
  }

  return images[key]();
}
