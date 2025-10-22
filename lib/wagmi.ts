import { createConfig, http } from 'wagmi';
import { plasma } from './plasma';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [plasma],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
    }),
  ],
  transports: {
    [plasma.id]: http(),
  },
});
