import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk, { makeEmptyTransactionSigner, TransactionSigner } from 'algosdk'
import { buildWithdrawGroup, MALGO_DECIMALS, ALGO_DECIMALS } from './buildWithdrawGroup'

const algorand = AlgorandClient.mainNet().setDefaultValidityWindow(110)

export interface SimulateResult {
  algoReceived: number
  rate: number
}

export function findAlgoPayout(
  innerTxns: algosdk.modelsv2.PendingTransactionResponse[] | undefined,
  address: string,
): bigint {
  if (!innerTxns) return 0n
  let total = 0n
  for (const inner of innerTxns) {
    const txn = inner.txn.txn
    if (
      txn.type === algosdk.TransactionType.pay &&
      txn.payment != null &&
      algosdk.encodeAddress(txn.payment.receiver.publicKey) === address
    ) {
      total += txn.payment.amount
    }
    total += findAlgoPayout(inner.innerTxns, address)
  }
  return total
}

async function simulate(address: string, microAmount: bigint, signer: TransactionSigner): Promise<SimulateResult> {
  console.log('[simulate] starting', { address, microAmount: microAmount.toString() })

  const simResult = await buildWithdrawGroup(algorand, address, microAmount, signer).simulate({
    allowUnnamedResources: true,
    allowEmptySignatures: true,
    fixSigners: true,
  })

  const appCallResult = simResult.simulateResponse.txnGroups[0]?.txnResults[1]?.txnResult
  const microAlgo = findAlgoPayout(appCallResult?.innerTxns, address)

  console.log('[simulate] inner txn payout', { microAlgo: microAlgo.toString() })

  if (microAlgo <= 0n) {
    throw new Error('No ALGO payout found in simulation inner transactions')
  }

  const algoReceived = Number(microAlgo) / 10 ** ALGO_DECIMALS
  const amount = Number(microAmount) / 10 ** MALGO_DECIMALS
  const rate = algoReceived / amount

  console.log('[simulate] result', { algoReceived, rate })
  return { algoReceived, rate }
}

export function useSimulate(address: string | null, amount: string, signer: TransactionSigner = makeEmptyTransactionSigner()) {
  const [debouncedKey, setDebouncedKey] = useState<[string, string] | null>(null)
  const [waiting, setWaiting] = useState(false)

  // Clear immediately on change
  useEffect(() => {
    setDebouncedKey(null)
  }, [address, amount])

  // Set debounced key after 1s
  useEffect(() => {
    const microAmount = Math.floor(Number(amount) * 10 ** MALGO_DECIMALS)
    if (!address || !amount || microAmount <= 0) {
      setWaiting(false)
      return
    }

    setWaiting(true)
    const timer = setTimeout(() => {
      setDebouncedKey([address, String(microAmount)])
      setWaiting(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [address, amount])

  const { data, isFetching, error } = useQuery({
    queryKey: ['simulate', debouncedKey?.[0], debouncedKey?.[1]],
    queryFn: () => simulate(debouncedKey![0], BigInt(debouncedKey![1]), signer),
    enabled: debouncedKey !== null,
    retry: false,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (error) console.error('[simulate] error', error)
  }, [error])

  return {
    result: data ?? null,
    waiting,
    loading: isFetching,
    error: error as Error | null,
  }
}
