import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletProvider, WalletManager, NetworkId, WalletId, DEFAULT_NETWORK_CONFIG } from '@txnlab/use-wallet-react'
import { WalletUIProvider } from '@txnlab/use-wallet-ui-react'
import '@txnlab/use-wallet-ui-react/dist/style.css'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

const manager = new WalletManager({
  wallets: [
    WalletId.PERA,
    WalletId.DEFLY,
    WalletId.LUTE,
    WalletId.EXODUS,
  ],
  networks: { [NetworkId.MAINNET]: DEFAULT_NETWORK_CONFIG[NetworkId.MAINNET] },
  defaultNetwork: NetworkId.MAINNET,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider manager={manager}>
        <WalletUIProvider theme="dark">
          <App />
        </WalletUIProvider>
      </WalletProvider>
    </QueryClientProvider>
  </StrictMode>,
)
