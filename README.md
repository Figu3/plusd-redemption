# plUSD Redemption UI

A minimal single-page React application for redeeming plUSD on Plasma Mainnet through the RedemptionVaultSwapper contract.

## Features

- **4 Redemption Paths**: Instant/Standard redemptions to self or custom recipient
- **Automatic ABI Fetching**: Fetches contract ABI from Plasmascan API with fallback
- **Smart Approval Flow**: Automatically detects when token approval is needed
- **Network Management**: Prompts to switch/add Plasma network (Chain ID 9745)
- **Activity Log**: Tracks last 5 transactions in localStorage
- **Gas Estimation**: Pre-flight gas estimation with readable error messages
- **Mock Mode**: Test mode that logs calldata without executing transactions
- **Responsive UI**: Clean, minimal design with TailwindCSS

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Connect Wallet

Connect your wallet (MetaMask, WalletConnect, etc.) and ensure you're on Plasma Mainnet (Chain ID 9745).

### 4. Redeem plUSD

1. Enter amount (or click MAX)
2. Select redemption mode (Instant or Standard)
3. Choose recipient (Self or Custom address)
4. Approve if needed
5. Click Redeem

## Configuration

### Environment Variables

Create a `.env.local` file (see `.env.local.example`):

```bash
# Optional custom RPC
NEXT_PUBLIC_PLASMA_RPC=https://rpc.plasma.to

# Optional custom addresses
NEXT_PUBLIC_PLUSD_ADDRESS=0xe90FE2DE4A415aD48B6DcEc08bA6ae98231948Ac
NEXT_PUBLIC_SWAPPER_ADDRESS=0x69EcaB6aA7bDFDdD99deF0891c0317076430ae50

# Enable mock mode (logs calldata without executing)
NEXT_PUBLIC_MOCK_MODE=false

# Optional WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Updating Default Addresses

Edit `lib/plasma.ts`:

```typescript
export const PLUSD_ADDRESS = '0xe90FE2DE4A415aD48B6DcEc08bA6ae98231948Ac';
export const SWAPPER_ADDRESS = '0x69EcaB6aA7bDFDdD99deF0891c0317076430ae50';
```

### Manual ABI Update

If the automatic ABI fetch from Plasmascan fails or you need to use a custom ABI:

1. Get the ABI JSON from Plasmascan or your contract source
2. Open `lib/swapperAbi.ts`
3. Replace the `SWAPPER_ABI` export with your ABI array

Example:

```typescript
export const SWAPPER_ABI = [
  {
    type: 'function',
    name: 'instantRedeem',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // ... rest of your ABI
] as const;
```

The app will automatically detect functions by name patterns:
- **Instant redemptions**: Functions with "instant" in the name
- **Standard redemptions**: Functions with "request" or "standard" in the name
- **Parameter detection**: Automatically distinguishes (uint256) vs (uint256, address)

## Network Details

**Plasma Mainnet**
- Chain ID: `9745`
- RPC: `https://rpc.plasma.to`
- Explorer: `https://plasmascan.to`

**Contract Addresses**
- plUSD Token: `0xe90FE2DE4A415aD48B6DcEc08bA6ae98231948Ac`
- RedemptionVaultSwapper: `0x69EcaB6aA7bDFDdD99deF0891c0317076430ae50`

## Architecture

```
plusd-redemption/
├── app/
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main page with wallet connection
│   └── globals.css        # Global styles
├── components/
│   ├── Providers.tsx      # Wagmi + React Query providers
│   └── RedeemForm.tsx     # Main redemption UI logic
├── hooks/
│   └── useAbi.ts          # ABI fetcher with Plasmascan API
├── lib/
│   ├── plasma.ts          # Plasma chain config & addresses
│   ├── erc20.ts           # Minimal ERC-20 ABI
│   ├── swapperAbi.ts      # Swapper ABI (fallback)
│   ├── wagmi.ts           # Wagmi configuration
│   └── activity.ts        # localStorage activity log
└── README.md
```

## How It Works

### Redemption Flow

1. **Connect Wallet**: User connects to Plasma Mainnet
2. **Read Token Data**: App reads plUSD decimals, symbol, and user balance
3. **Enter Amount**: User inputs redemption amount
4. **Check Allowance**: App checks if Swapper has sufficient allowance
5. **Approve (if needed)**: User approves Swapper to spend plUSD
6. **Select Mode**: User chooses Instant or Standard redemption
7. **Select Recipient**: User chooses to redeem to self or custom address
8. **Execute**: App calls the appropriate Swapper function
9. **Track**: Transaction is added to activity log

### Function Detection

The app dynamically detects redemption functions from the ABI:

- **instant_self**: `instantRedeem(uint256 amount)`
- **instant_recipient**: `instantRedeem(uint256 amount, address recipient)`
- **standard_self**: `requestRedeem(uint256 amount)` or similar
- **standard_recipient**: `requestRedeem(uint256 amount, address recipient)` or similar

If your contract uses different function names, the app will attempt to match them by pattern (instant/request/standard + parameter count).

## Mock Mode

Enable mock mode to test the UI without executing real transactions:

```bash
NEXT_PUBLIC_MOCK_MODE=true npm run dev
```

Mock mode will:
- Log function calls and parameters to console
- Skip actual blockchain transactions
- Show the encoded calldata for each operation

## Troubleshooting

### ABI Fetch Failed

If you see "Using fallback ABI" in the console:

1. Check if Plasmascan API is accessible
2. Verify the Swapper address is correct
3. Manually update the ABI in `lib/swapperAbi.ts`

### Wrong Network

If the app shows "Wrong Network":

1. Click "Switch to Plasma"
2. If Plasma isn't in your wallet, you'll be prompted to add it
3. Alternatively, manually add the network:
   - Network Name: Plasma
   - RPC URL: https://rpc.plasma.to
   - Chain ID: 9745
   - Currency Symbol: ETH
   - Block Explorer: https://plasmascan.to

### Function Detection Failed

If you see "ABI mismatch: could not find redemption methods":

1. Verify your ABI in `lib/swapperAbi.ts` is correct
2. Check that function names include "instant", "request", or "standard"
3. Verify parameter types are (uint256) or (uint256, address)
4. Update the detection logic in `hooks/useAbi.ts` if using custom naming

### Approval Not Working

If approval transactions fail:

1. Check you have enough ETH for gas on Plasma
2. Verify the Swapper address is correct
3. Try manually approving in your wallet
4. Check the transaction on Plasmascan for error details

## Policy Groups Note

If you're using wallet policy groups (like Safe/Gnosis), remember to set the token allowlist to "Any" or specifically include plUSD and the underlying redemption tokens.

## Building for Production

```bash
npm run build
npm start
```

The app is optimized for production with:
- Server-side rendering disabled for wallet components
- Automatic code splitting
- Optimized bundle size
- Static asset optimization

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **wagmi v2** - React hooks for Ethereum
- **viem v2** - Ethereum library
- **TailwindCSS** - Utility-first CSS
- **React Query** - Async state management

## License

ISC

## Support

For issues with:
- **The UI**: Check this README and verify your configuration
- **Plasmascan API**: Visit https://plasmascan.to
- **Contract behavior**: Verify the contract on Plasmascan
- **Wallet connection**: Check your wallet is configured for Plasma

---

Built with minimal dependencies for maximum reliability.
