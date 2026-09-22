import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { lessonDataSchema, lessonFrontmatterSchema, moduleSchema, practiceSchema } from './lib/content/schema';

export const collections = {
  lessons: defineCollection({ loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }), schema: lessonFrontmatterSchema }),
  lessonData: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/lesson-data' }), schema: lessonDataSchema }),
  practice: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/practice' }), schema: practiceSchema }),
  modules: defineCollection({ loader: file('./src/content/modules.yaml'), schema: moduleSchema }),
};
