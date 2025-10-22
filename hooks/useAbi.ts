'use client';

import { useState, useEffect } from 'react';
import { PLASMASCAN_API_URL, SWAPPER_ADDRESS } from '@/lib/plasma';
import { SWAPPER_ABI } from '@/lib/swapperAbi';

export type RedemptionFunction = {
  name: string;
  type: 'instant_self' | 'instant_recipient' | 'standard_self' | 'standard_recipient';
  abi: any;
};

export function useAbi() {
  const [abi, setAbi] = useState<any[]>(SWAPPER_ABI as any[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redemptionFunctions, setRedemptionFunctions] = useState<RedemptionFunction[]>([]);

  useEffect(() => {
    const fetchAbi = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `${PLASMASCAN_API_URL}?module=contract&action=getabi&address=${SWAPPER_ADDRESS}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (data.status === '1' && data.result) {
          const parsedAbi = JSON.parse(data.result);
          setAbi(parsedAbi);
          console.log('✓ ABI fetched from Plasmascan');
        } else {
          console.warn('⚠ Using fallback ABI:', data.message || 'API returned no ABI');
          setError('Using fallback ABI - API fetch failed');
        }
      } catch (err) {
        console.warn('⚠ ABI fetch failed, using fallback:', err);
        setError('Using fallback ABI - fetch failed');
      } finally {
        setLoading(false);
      }
    };

    fetchAbi();
  }, []);

  // Parse redemption functions from ABI
  useEffect(() => {
    if (!abi || abi.length === 0) return;

    const functions: RedemptionFunction[] = [];

    // Look for function signatures matching redemption patterns
    const functionEntries = abi.filter(
      (item: any) => item.type === 'function' && item.name
    );

    // Map to detect instant and standard/request redemptions
    const instantSelf = functionEntries.find(
      (f: any) =>
        (f.name.toLowerCase().includes('instant') || f.name.toLowerCase().includes('redeem')) &&
        f.inputs?.length === 1 &&
        f.inputs[0].type === 'uint256'
    );

    const instantRecipient = functionEntries.find(
      (f: any) =>
        (f.name.toLowerCase().includes('instant') || f.name.toLowerCase().includes('redeem')) &&
        f.inputs?.length === 2 &&
        f.inputs[0].type === 'uint256' &&
        f.inputs[1].type === 'address'
    );

    const standardSelf = functionEntries.find(
      (f: any) =>
        (f.name.toLowerCase().includes('request') || f.name.toLowerCase().includes('standard')) &&
        f.inputs?.length === 1 &&
        f.inputs[0].type === 'uint256'
    );

    const standardRecipient = functionEntries.find(
      (f: any) =>
        (f.name.toLowerCase().includes('request') || f.name.toLowerCase().includes('standard')) &&
        f.inputs?.length === 2 &&
        f.inputs[0].type === 'uint256' &&
        f.inputs[1].type === 'address'
    );

    // If we don't find request/standard variants, look for generic redeem functions
    if (!standardSelf && !standardRecipient) {
      const redeemSelf = functionEntries.find(
        (f: any) =>
          f.name.toLowerCase().includes('redeem') &&
          !f.name.toLowerCase().includes('instant') &&
          f.inputs?.length === 1 &&
          f.inputs[0].type === 'uint256'
      );
      const redeemRecipient = functionEntries.find(
        (f: any) =>
          f.name.toLowerCase().includes('redeem') &&
          !f.name.toLowerCase().includes('instant') &&
          f.inputs?.length === 2 &&
          f.inputs[0].type === 'uint256' &&
          f.inputs[1].type === 'address'
      );

      if (redeemSelf) functions.push({ name: redeemSelf.name, type: 'standard_self', abi: redeemSelf });
      if (redeemRecipient) functions.push({ name: redeemRecipient.name, type: 'standard_recipient', abi: redeemRecipient });
    } else {
      if (standardSelf) functions.push({ name: standardSelf.name, type: 'standard_self', abi: standardSelf });
      if (standardRecipient) functions.push({ name: standardRecipient.name, type: 'standard_recipient', abi: standardRecipient });
    }

    if (instantSelf) functions.push({ name: instantSelf.name, type: 'instant_self', abi: instantSelf });
    if (instantRecipient) functions.push({ name: instantRecipient.name, type: 'instant_recipient', abi: instantRecipient });

    setRedemptionFunctions(functions);

    if (functions.length === 0) {
      setError('ABI mismatch: could not find redemption methods');
    }
  }, [abi]);

  return { abi, loading, error, redemptionFunctions };
}
