// Placeholder ABI for RedemptionVaultSwapper
// If automatic fetch from Plasmascan fails, paste the actual ABI here
export const SWAPPER_ABI = [
  // Placeholder - will be replaced by fetched ABI or manually pasted
  {
    type: 'function',
    name: 'instantRedeem',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'instantRedeem',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'requestRedeem',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'requestRedeem',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;
