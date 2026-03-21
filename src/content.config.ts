import { z, defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import dayjs from "dayjs";

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
      publishDate: z.coerce.date().transform((date) => dayjs(date).format("YYYY-MM-DD")),
      updateDate: z
        .coerce
        .date()
        .transform((date) => dayjs(date).format("YYYY-MM-DD"))
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
