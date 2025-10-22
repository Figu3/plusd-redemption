import { defineChain } from 'viem';

export const plasma = defineChain({
  id: 9745,
  name: 'Plasma',
  network: 'plasma',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_PLASMA_RPC || 'https://rpc.plasma.to'],
    },
    public: {
      http: ['https://rpc.plasma.to'],
    },
  },
  blockExplorers: {
    default: { name: 'Plasmascan', url: 'https://plasmascan.to' },
  },
  contracts: {},
});

export const PLUSD_ADDRESS = (process.env.NEXT_PUBLIC_PLUSD_ADDRESS ||
  '0xe90FE2DE4A415aD48B6DcEc08bA6ae98231948Ac') as `0x${string}`;

export const SWAPPER_ADDRESS = (process.env.NEXT_PUBLIC_SWAPPER_ADDRESS ||
  '0x69EcaB6aA7bDFDdD99deF0891c0317076430ae50') as `0x${string}`;

export const PLASMASCAN_API_URL = 'https://plasmascan.to/api';
