import { useState } from 'react'

export interface WithdrawalRecord {
  txId: string
  groupId: string
  confirmedRound: number
  mAlgoSent: number
  algoReceived: number
  timestamp: number
}

const STORAGE_KEY = 'messina-withdraw-history'

function load(): WithdrawalRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(records: WithdrawalRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function useWithdrawHistory() {
  const [history, setHistory] = useState<WithdrawalRecord[]>(load)

  function addRecord(record: WithdrawalRecord) {
    setHistory((prev) => {
      const next = [record, ...prev]
      save(next)
      return next
    })
  }

  return { history, addRecord }
}
