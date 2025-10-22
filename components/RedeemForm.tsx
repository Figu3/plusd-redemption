'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { formatUnits, parseUnits, isAddress } from 'viem';
import { plasma, PLUSD_ADDRESS, SWAPPER_ADDRESS } from '@/lib/plasma';
import { ERC20_ABI } from '@/lib/erc20';
import { useAbi } from '@/hooks/useAbi';
import { saveActivity, getActivities, updateActivityStatus, Activity } from '@/lib/activity';

type RedemptionMode = 'instant' | 'standard';
type RecipientMode = 'self' | 'custom';

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

export default function RedeemForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { abi, loading: abiLoading, error: abiError, redemptionFunctions } = useAbi();

  // Form state
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [redemptionMode, setRedemptionMode] = useState<RedemptionMode>('instant');
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('self');
  const [error, setError] = useState<string | null>(null);
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Read token metadata
  const { data: symbol } = useReadContract({
    address: PLUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: plasma.id,
  });

  const { data: decimals } = useReadContract({
    address: PLUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: plasma.id,
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: PLUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: plasma.id,
    query: { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: PLUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, SWAPPER_ADDRESS] : undefined,
    chainId: plasma.id,
    query: { enabled: !!address },
  });

  // Write contracts
  const { data: approveHash, writeContract: approve, isPending: isApprovePending } = useWriteContract();
  const { data: redeemHash, writeContract: redeem, isPending: isRedeemPending } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveLoading, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isRedeemLoading, isSuccess: isRedeemSuccess } = useWaitForTransactionReceipt({
    hash: redeemHash,
  });

  // Load activities
  useEffect(() => {
    setActivities(getActivities());
  }, []);

  // Refetch allowance after approval
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Determine if we're on the correct network
  const isCorrectNetwork = chainId === plasma.id;

  // Calculate amount in wei
  const amountWei = useMemo(() => {
    if (!amount || decimals === undefined) return 0n;
    try {
      return parseUnits(amount, Number(decimals));
    } catch {
      return 0n;
    }
  }, [amount, decimals]);

  // Check if approval is needed
  const needsApproval = useMemo(() => {
    if (allowance === undefined || !amountWei) return false;
    return BigInt(allowance) < amountWei;
  }, [allowance, amountWei]);

  // Validate inputs
  const isValidAmount = useMemo(() => {
    if (!amount || balance === undefined || decimals === undefined) return false;
    try {
      const amt = parseUnits(amount, Number(decimals));
      return amt > 0n && amt <= BigInt(balance);
    } catch {
      return false;
    }
  }, [amount, balance, decimals]);

  const isValidRecipient = useMemo(() => {
    if (recipientMode === 'self') return true;
    return isAddress(recipient);
  }, [recipientMode, recipient]);

  // Get the selected function based on mode
  const selectedFunction = useMemo(() => {
    const key = `${redemptionMode}_${recipientMode}` as 'instant_self' | 'instant_recipient' | 'standard_self' | 'standard_recipient';
    return redemptionFunctions.find(f => f.type === key);
  }, [redemptionMode, recipientMode, redemptionFunctions]);

  // Handle MAX button
  const handleMax = () => {
    if (balance !== undefined && decimals !== undefined) {
      setAmount(formatUnits(BigInt(balance), Number(decimals)));
    }
  };

  // Handle approve
  const handleApprove = async () => {
    if (!isValidAmount || !address) return;

    setError(null);

    if (MOCK_MODE) {
      console.log('[MOCK] Approve:', {
        spender: SWAPPER_ADDRESS,
        amount: amountWei.toString(),
      });
      return;
    }

    try {
      approve({
        address: PLUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SWAPPER_ADDRESS, amountWei],
        chainId: plasma.id,
      });

      saveActivity({
        type: 'approve',
        mode: redemptionMode,
        amount: amount,
        hash: '',
        status: 'pending',
      });
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    }
  };

  // Handle redeem
  const handleRedeem = async () => {
    if (!isValidAmount || !isValidRecipient || !selectedFunction) return;

    setError(null);
    setGasEstimate(null);

    const args = recipientMode === 'self'
      ? [amountWei]
      : [amountWei, recipient as `0x${string}`];

    if (MOCK_MODE) {
      console.log('[MOCK] Redeem:', {
        function: selectedFunction.name,
        args: args.map(a => typeof a === 'bigint' ? a.toString() : a),
      });
      return;
    }

    try {
      // Estimate gas first
      // Note: simulateContract would be used here but for simplicity we'll skip to writeContract

      redeem({
        address: SWAPPER_ADDRESS,
        abi: abi,
        functionName: selectedFunction.name,
        args: args as any,
        chainId: plasma.id,
      });

      const activity = saveActivity({
        type: 'redeem',
        mode: redemptionMode,
        amount: amount,
        hash: '',
        status: 'pending',
      });

      setActivities(getActivities());
    } catch (err: any) {
      const errorMsg = err.message || 'Redemption failed';
      setError(errorMsg);
      console.error('Redemption error:', err);
    }
  };

  // Update activity when transaction succeeds
  useEffect(() => {
    if (redeemHash && isRedeemSuccess) {
      const acts = getActivities();
      const pending = acts.find(a => a.status === 'pending' && a.type === 'redeem');
      if (pending) {
        updateActivityStatus(pending.id, 'success');
        setActivities(getActivities());
      }
      refetchBalance();
    }
  }, [redeemHash, isRedeemSuccess, refetchBalance]);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-300">Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Network Status */}
      <div className="bg-gray-800 rounded-lg p-4">
        {!isCorrectNetwork ? (
          <div className="space-y-3">
            <p className="text-yellow-400">⚠ Wrong Network</p>
            <button
              onClick={() => switchChain({ chainId: plasma.id })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Switch to Plasma (9745)
            </button>
          </div>
        ) : (
          <p className="text-green-400">✓ Connected to Plasma Mainnet</p>
        )}
      </div>

      {/* ABI Status */}
      {abiError && abiError.includes('mismatch') && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-4">
          <p className="text-red-400 font-semibold">{abiError}</p>
          <p className="text-sm text-gray-400 mt-2">
            Please update the ABI in <code>lib/swapperAbi.ts</code>
          </p>
        </div>
      )}

      {/* Token Panel */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Redeem {symbol || 'plUSD'}</h2>
          <div className="text-sm text-gray-400">
            Balance: {balance !== undefined && decimals !== undefined ? formatUnits(BigInt(balance), Number(decimals)) : '0'} {symbol || 'plUSD'}
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Amount</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isCorrectNetwork}
            />
            <button
              onClick={handleMax}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
              disabled={!isCorrectNetwork}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Redemption Mode */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">Redemption Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={redemptionMode === 'instant'}
                onChange={() => setRedemptionMode('instant')}
                className="w-4 h-4"
              />
              <span>Instant</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={redemptionMode === 'standard'}
                onChange={() => setRedemptionMode('standard')}
                className="w-4 h-4"
              />
              <span>Standard</span>
            </label>
          </div>
          {redemptionMode === 'standard' && (
            <p className="text-sm text-yellow-400 mt-2">
              ⚠ Standard redemptions may require back-office processing and may settle later than instant.
            </p>
          )}
        </div>

        {/* Recipient Mode */}
        <div className="space-y-2">
          <label className="block text-sm text-gray-400">
            Recipient
            <span className="ml-2 text-xs text-gray-500" title="If using policy groups, set tokens to Any">
              💡 Tip: Set tokens to "Any" in policy groups
            </span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={recipientMode === 'self'}
                onChange={() => setRecipientMode('self')}
                className="w-4 h-4"
              />
              <span>Self</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={recipientMode === 'custom'}
                onChange={() => setRecipientMode('custom')}
                className="w-4 h-4"
              />
              <span>Custom Address</span>
            </label>
          </div>
          {recipientMode === 'custom' && (
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {needsApproval && isCorrectNetwork && (
            <button
              onClick={handleApprove}
              disabled={!isValidAmount || isApprovePending || isApproveLoading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded font-semibold"
            >
              {isApprovePending || isApproveLoading ? 'Approving...' : 'Approve'}
            </button>
          )}

          <button
            onClick={handleRedeem}
            disabled={
              !isCorrectNetwork ||
              !isValidAmount ||
              !isValidRecipient ||
              needsApproval ||
              !selectedFunction ||
              isRedeemPending ||
              isRedeemLoading
            }
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded font-semibold"
          >
            {isRedeemPending || isRedeemLoading ? 'Redeeming...' : 'Redeem'}
          </button>
        </div>

        {/* Transaction Links */}
        {(approveHash || redeemHash) && (
          <div className="space-y-2 text-sm">
            {approveHash && (
              <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                <span className="text-gray-400">Approval:</span>
                <a
                  href={`https://plasmascan.to/tx/${approveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  View on Plasmascan
                </a>
              </div>
            )}
            {redeemHash && (
              <div className="flex items-center justify-between bg-gray-700 rounded p-2">
                <span className="text-gray-400">Redemption:</span>
                <a
                  href={`https://plasmascan.to/tx/${redeemHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  View on Plasmascan
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity Log */}
      {activities.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between bg-gray-700 rounded p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`
                    ${activity.status === 'success' ? 'text-green-400' : ''}
                    ${activity.status === 'pending' ? 'text-yellow-400' : ''}
                    ${activity.status === 'failed' ? 'text-red-400' : ''}
                  `}>
                    {activity.status === 'success' ? '✓' : activity.status === 'pending' ? '⏳' : '✗'}
                  </span>
                  <span className="text-gray-300">
                    {activity.type === 'approve' ? 'Approve' : `${activity.mode} Redeem`}
                  </span>
                  <span className="text-gray-400">{activity.amount} {symbol || 'plUSD'}</span>
                </div>
                {activity.hash && (
                  <a
                    href={`https://plasmascan.to/tx/${activity.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
