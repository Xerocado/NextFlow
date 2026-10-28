import { mergeConfig } from 'vite'
import base from '../vite.config'

// Portas exclusivas do roteiro isolado; não muda o desenvolvimento normal.
export default mergeConfig(base, {
  server: {
    port: 15173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:18080' } },
  },
})
