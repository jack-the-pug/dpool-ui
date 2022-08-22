/// <reference types="vite/client" />

// must have VITE prefix
interface ImportMetaEnv {
  readonly VITE_POLYGON_SCAN_KEY: string // https://docs.polygonscan.com/api-endpoints/accounts
  readonly VITE_ETHEREUM_SCAN_KEY: string // https://docs.etherscan.io/getting-started/endpoint-urls
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
