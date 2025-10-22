'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import RedeemForm from '@/components/RedeemForm';

export default function Home() {
  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">plUSD Redemption</h1>
          <div>
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => connect({ connector })}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                  >
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Main Form */}
        <RedeemForm />

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Plasma Mainnet • Chain ID 9745</p>
          <p className="mt-2">
            plUSD: <code className="text-gray-400">0xf91c31299E998C5127Bc5F11e4a657FC0cF358CD</code>
          </p>
        </footer>
      </div>
    </main>
  );
}
