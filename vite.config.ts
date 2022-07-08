import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { replaceCodePlugin } from 'vite-plugin-replace'

export default defineConfig({
  plugins: [
    react(),
    // fix provider not found. https://github.com/NoahZinsmeister/web3-react/issues/557#issuecomment-1152941052
    replaceCodePlugin({
      replacements: [
        {
          from: 'const zustand_1 = __importDefault(require("zustand"));',
          to: 'const zustand_1 = __importDefault(require("zustand"));const providers_1 = __importStar(require("@ethersproject/providers"));',
        },
        {
          from: "const { Web3Provider } = yield Promise.resolve().then(() => __importStar(require('@ethersproject/providers')));",
          to: 'const { Web3Provider } = yield Promise.resolve().then(() => providers_1);',
        },
      ],
    }),
  ],

  define: {
    // By default, Vite doesn't include shims for NodeJS/
    // necessary for segment analytics lib to work
    global: {},
  },
})
