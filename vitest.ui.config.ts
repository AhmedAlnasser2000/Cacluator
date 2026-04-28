import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      include: ['src/**/*.ui.test.ts', 'src/**/*.ui.test.tsx'],
      setupFiles: ['src/test/setup-ui.ts'],
      reporters: ['default'],
      testTimeout: 30000,
      css: true,
      clearMocks: true,
      restoreMocks: true,
    },
  }),
);
