import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { makeEmptyTransactionSigner } from 'algosdk'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useMAlgoBalance } from './useMAlgoBalance'
import { useSimulate, findAlgoPayout } from './useSimulate'
import { useWithdrawHistory } from './useWithdrawHistory'
import { buildWithdrawGroup, MALGO_DECIMALS, ALGO_DECIMALS } from './buildWithdrawGroup'

const algorand = AlgorandClient.mainNet()

export default function App() {
  const { activeAccount, transactionSigner } = useWallet()
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useMAlgoBalance(activeAccount?.address ?? null)
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { history, addRecord } = useWithdrawHistory()

  const address = activeAccount?.address ?? null
  const { result: simResult, waiting: simWaiting, loading: simLoading, error: simError } = useSimulate(address, amount, makeEmptyTransactionSigner())

  // Clear amount when account changes
  useEffect(() => {
    setAmount('')
    setSubmitError(null)
  }, [address])

  function setFixed(mAlgo: number) {
    setAmount(String(mAlgo))
  }

  function setPercent(pct: number) {
    if (balance === null) return
    const raw = Math.floor((balance * pct) / 100 * 1_000_000) / 1_000_000
    setAmount(String(raw))
  }

  async function handleSubmit() {
    if (!address || !amount || Number(amount) <= 0) return
    const microAmount = BigInt(Math.floor(Number(amount) * 10 ** MALGO_DECIMALS))

    setSubmitting(true)
    setSubmitError(null)
    console.log('[unstake] submitting', { address, microAmount: microAmount.toString() })

    try {
      const result = await buildWithdrawGroup(algorand, address, microAmount, transactionSigner).execute()
      const txId = result.txIds[0]
      const { groupId } = result
      const confirmedRound = Number(result.confirmations[0].confirmedRound ?? 0)

      const appCallConfirmation = result.confirmations[1]
      const microAlgo = findAlgoPayout(appCallConfirmation?.innerTxns, address)
      const algoReceived = Number(microAlgo) / 10 ** ALGO_DECIMALS
      const mAlgoSent = Number(microAmount) / 10 ** MALGO_DECIMALS

      console.log('[unstake] success', { txId, groupId, confirmedRound, algoReceived })

      addRecord({ txId, groupId, confirmedRound, mAlgoSent, algoReceived, timestamp: Date.now() })
      refetchBalance()
      setAmount('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[unstake] error', e)
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const hasBalance = balance !== null && balance > 0

  return (
    <div className="app">
      <header className="header">
        <h1>Messina.one Unstake</h1>
        <WalletButton />
      </header>

      <main className="main">
        {activeAccount ? (
          <>
            <div className="card">
              <h2>Connected</h2>
              <p className="address-full">{activeAccount.address}</p>
            </div>

            <div className="card card-row">
              <h2>mALGO Balance</h2>
              <p className="balance">
                {balanceLoading ? '…' : balance === null ? 'Error' : `${balance.toLocaleString()} mALGO`}
              </p>
            </div>

            {!balanceLoading && (
              hasBalance ? (
                <div className="card">
                  <h2>Unstake</h2>
                  <p className="card-note">We recommend doing a small test unstake first before unstaking your full balance.</p>
                  <input
                    className="amount-input"
                    type="number"
                    min="0"
                    placeholder="0.000000"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setSubmitError(null) }}
                  />
                  <div className="pct-buttons">
                    <button className="btn btn-outline" onClick={() => setFixed(5)}>5 mALGO</button>
                    <button className="btn btn-outline" onClick={() => setPercent(10)}>10%</button>
                    <button className="btn btn-outline" onClick={() => setPercent(100)}>100%</button>
                  </div>

                  {(simWaiting || simLoading || simResult || simError) && (
                    <>
                      <hr className="divider" />
                      {simWaiting ? (
                        <p className="sim-loading">Waiting…</p>
                      ) : simLoading ? (
                        <p className="sim-loading">Simulating…</p>
                      ) : simError ? (
                        <p className="sim-error">{simError.message}</p>
                      ) : simResult ? (
                        <div className="sim-summary">
                          <div className="sim-row">
                            <span className="sim-label">You send</span>
                            <span className="sim-value">{Number(amount).toLocaleString()} mALGO</span>
                          </div>
                          <div className="sim-row">
                            <span className="sim-label">You receive</span>
                            <span className="sim-value">{simResult.algoReceived.toLocaleString(undefined, { minimumFractionDigits: 6 })} ALGO</span>
                          </div>
                          <div className="sim-row">
                            <span className="sim-label">Rate</span>
                            <span className="sim-value">{simResult.rate.toFixed(6)} ALGO / mALGO</span>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}

                  <hr className="divider" />
                  {submitError && <p className="sim-error" style={{ marginBottom: '0.75rem' }}>{submitError}</p>}
                  <button
                    className="btn btn-primary btn-block"
                    disabled={submitting || !simResult || Number(amount) <= 0}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Submitting…' : 'Unstake'}
                  </button>
                </div>
              ) : (
                <div className="card empty-state">
                  <p>No mALGO to unstake.</p>
                </div>
              )
            )}

            {history.length > 0 && (
              <>
                <h2 className="section-title">Unstake History</h2>
                {history.map((record) => (
                  <div key={record.txId} className="card">
                    <div className="sim-row">
                      <span className="sim-label">Sent</span>
                      <span className="sim-value">{record.mAlgoSent.toLocaleString()} mALGO</span>
                    </div>
                    <div className="sim-row" style={{ marginTop: '0.5rem' }}>
                      <span className="sim-label">Received</span>
                      <span className="sim-value received">{record.algoReceived.toLocaleString(undefined, { minimumFractionDigits: 6 })} ALGO</span>
                    </div>
                    <div className="sim-row" style={{ marginTop: '0.5rem' }}>
                      <span className="sim-label">Tx</span>
                      <a
                        className="txid"
                        href={`https://v2.algo.surf/group/${encodeURIComponent(record.groupId)}/${record.confirmedRound}/transactions`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {record.txId.slice(0, 8)}…{record.txId.slice(-6)}
                      </a>
                    </div>
                    <div className="sim-row" style={{ marginTop: '0.5rem' }}>
                      <span className="sim-label">Time</span>
                      <span className="sim-value timestamp">{new Date(record.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div className="card empty-state">
            <p>Connect your wallet to get started.</p>
          </div>
        )}
      </main>
      <footer className="footer">
        <a href="https://github.com/d13co/messina-unstake" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}
