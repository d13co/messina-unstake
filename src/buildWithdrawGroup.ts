import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk, { TransactionSigner } from 'algosdk'

export const APP_ID = 2713771029n
export const ASSET_ID = 1185173782n
export const MALGO_DECIMALS = 6
export const ALGO_DECIMALS = 6

const APP_ARGS = [
  Uint8Array.from(atob('EYC51w=='), (c) => c.charCodeAt(0)),
  Uint8Array.from(atob('AAEx'), (c) => c.charCodeAt(0)),
  Uint8Array.from(atob('AAEAAgABMQ=='), (c) => c.charCodeAt(0)),
]

export function buildWithdrawGroup(
  algorand: AlgorandClient,
  sender: string,
  microAmount: bigint,
  signer: TransactionSigner,
) {
  const appEscrow = algosdk.getApplicationAddress(APP_ID)

  return algorand.newGroup()
    .addAssetTransfer({
      sender,
      receiver: appEscrow,
      assetId: ASSET_ID,
      amount: microAmount,
      signer,
    })
    .addAppCall({
      sender,
      appId: APP_ID,
      onComplete: algosdk.OnApplicationComplete.NoOpOC,
      args: APP_ARGS,
      assetReferences: [ASSET_ID],
      staticFee: (6000).microAlgo(),
      signer,
    })
}
