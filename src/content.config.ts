import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, '#rrggbb 형식이어야 합니다');

const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: () =>
    z.object({
      title: z.string(),
      titleKo: z.string().optional(),
      order: z.number().int(),
      kind: z.string(),
      summary: z.string().max(160),
      url: z.url(),
      status: z.string().optional(),
      features: z.array(z.string()).min(1),
      // 홈 화면에서 이 작업에 붙는 연출. 새 작업은 'none'으로 시작하면 됩니다.
      effect: z.enum(['squish', 'lamp', 'none']).default('none'),
      theme: z.object({
        mode: z.enum(['light', 'dark']),
        bg: hex,
        fg: hex,
        muted: hex,
        accent: hex,
      }),
    }),
});

export const collections = { works };
