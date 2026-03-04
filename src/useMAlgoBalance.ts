import { useEffect, useState, useCallback } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

const MALGO_ASSET_ID = 1185173782n
const MALGO_DECIMALS = 6

const algorand = AlgorandClient.mainNet()

export function useMAlgoBalance(address: string | null) {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!address) {
      setBalance(null)
      return
    }

    let cancelled = false
    setBalance(null)
    setLoading(true)

    algorand.account.getInformation(address)
      .then((info) => {
        if (cancelled) return
        const holding = info.assets?.find((a) => a.assetId === MALGO_ASSET_ID)
        setBalance(holding ? Number(holding.amount) / 10 ** MALGO_DECIMALS : 0)
      })
      .catch(() => { if (!cancelled) setBalance(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [address, tick])

  return { balance, loading, refetch }
}
