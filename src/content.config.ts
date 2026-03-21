import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import dayjs from "dayjs";

const shanghaiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatShanghaiDate(value: Date) {
  const parts = shanghaiDateFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (year && month && day) {
    return `${year}-${month}-${day}`;
  }

  return dayjs(value).format("YYYY-MM-DD");
}

function normalizeDate(value: string | Date) {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  return formatShanghaiDate(value);
}

const blog = defineCollection({
  loader: glob({
    pattern: "*.md",
    base: "src/content/posts",
  }),
  schema: () =>
    z.object({
      title: z.string(),
      slug: z.string().optional(),
      description: z.string().optional(),
      cover: z.string().optional(),
      publishDate: z.union([z.string(), z.coerce.date()]).transform(normalizeDate),
      updateDate: z
        .union([z.string(), z.coerce.date()])
        .transform(normalizeDate)
        .optional(),
      categories: z
        .array(z.string())
        .refine((items) => new Set(items).size === items.length, {
          message: "categories must be unique",
        })
        .optional(),
      tags: z.array(z.string()).optional(),
      draft: z.boolean().optional().default(false),
    }),
});

const pages = defineCollection({
  loader: glob({
    pattern: "*.md",
    base: "src/content/pages",
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    date: z.union([z.string(), z.coerce.date()]).optional(),
    layout: z.string().optional(),
    menu: z
      .object({
        main: z
          .object({
            weight: z.number().optional(),
            params: z
              .object({
                icon: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  }),
});

export const collections = { blog, pages };
