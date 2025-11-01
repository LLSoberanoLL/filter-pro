import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: 'src/filter-pro.ts',
      name: 'FilterPro',
      fileName: 'filter-pro',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})