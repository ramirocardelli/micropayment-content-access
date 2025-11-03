import { Wallet, WalletStorageManager, WalletSigner, Services } from "@bsv/wallet-toolbox"
import { WalletInterface, KeyDeriver, PrivateKey } from "@bsv/sdk"

export function makeWallet (
    privateKey: string,
    chain: 'test' | 'main' = 'main',
    storageURL: string = 'https://storage.babbage.systems',
): WalletInterface {
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, 'hex'))
    const storageManager = new WalletStorageManager(keyDeriver.identityKey)
    const signer = new WalletSigner(chain, keyDeriver, storageManager)

    // Create services
    const services = new Services(chain)

    // Create and return wallet
    const wallet = new Wallet(signer, services)

    return wallet
}