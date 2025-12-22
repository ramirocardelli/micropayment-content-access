import { WalletClient, P2PKH, type WalletProtocol, PublicKey } from '@bsv/sdk'

/**
 * Create a payment for article content purchase
 * Sends payment to author using BRC-29 identity-based payment
 */
export async function createContentPayment(
  wallet: WalletClient,
  authorAddress: string,
  authorIdentityKey: string,
  satoshis: number,
  articleId: string,
  articleTitle: string
): Promise<{ txid: string; tx: number[] }> {
  // Validate author identity key
  if (!authorIdentityKey) {
    throw new Error('Author identity key is missing. Please check article configuration.');
  }

  console.log(`Creating content payment: ${satoshis} sats for article ${articleId} to identity ${authorIdentityKey}`);

  // Get sender identity
  const { publicKey: senderIdentityKey } = await wallet.getPublicKey({
    identityKey: true
  })

  // Payment metadata for BRC-29
  const paymentData = {
    senderIdentityKey,
    derivationPrefix: "efM69kM/9YZ9X4QV",
    derivationSuffix: "LgdVITVQAU7LNB/xbaBRRDjDcBaoG/vGBpzLDd328EoeHVzylxNE9SpW/p/kgCbbBPbW4I4R9d/xsOARzIxuCQ=="
  }

  // Derive payment address using BRC-29
  const brc29ProtocolID: WalletProtocol = [2, '3241645161d8']
  const keyID = `${paymentData.derivationPrefix} ${paymentData.derivationSuffix}`
  const { publicKey: paymentPublicKey } = await wallet.getPublicKey({
    protocolID: brc29ProtocolID,
    keyID,
    counterparty: authorIdentityKey
  })

  // Create P2PKH locking script
  const script = new P2PKH().lock(PublicKey.fromString(paymentPublicKey).toAddress())
  // const script = new P2PKH().lock(authorAddress)

  // Create transaction
  const response = await wallet.createAction({
    description: `Unlock article: ${articleTitle}`,
    outputs: [{
      satoshis,
      lockingScript: script.toHex(),
      outputDescription: `Article payment (${articleId})`,
      customInstructions: JSON.stringify(paymentData)
    }]
  })

  // Store payment metadata for recipient to internalize later
  const payments = JSON.parse(localStorage.getItem('payments') || '[]')
  payments.push({ response, paymentData })
  localStorage.setItem('payments', JSON.stringify(payments))

  return {
    txid: response.txid!,
    tx: response.tx!
  };
}