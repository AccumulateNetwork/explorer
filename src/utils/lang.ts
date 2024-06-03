export const tooltip = {
  tokenAcctUrl:
    "The URL of the token account, where an account's balances and transactions are organized for a particular token",
  tokenUrl: 'The URL of the token',
  acctUrl: 'The URL of the account',
  msgId: 'The ID of the message',
  sigSignerUrl: 'The URL of the signer',
  publicKey: 'The public key used to sign',
  txHash: 'The hash of the transaction',
  sigValue: 'The value of the signature',
  sigDelegators: 'The authorities the signatures is delegated through',
  sigAccept: 'The signer accepts the transaction',
  sigReject: 'The signer rejects the transaction',
  sigAbstain: 'The signer abstains from the transaction',
  authSig:
    'This signature is an internal message produced by the protocol (not a user)',
  token: 'The name and symbol of the token',
  balance: 'The total number of tokens for this account',
  creditBalance:
    'The total number of credits for this account. Credits are non-transferable tokens used in the Accumulate network to fund ADI-create transactions and pay for data storage',
  creditsAdded: 'Number of credits added',
  tokenSymbol:
    'Abbreviation used to easily identify the token within Accumulate',
  tokenPrecision:
    'The minimum divisible unit of this token (i.e. how many digits after the decimal point)',
  txType: 'Transaction type',
  txFrom: 'The sending party of this transaction',
  txTo: 'The receiving party, or parties, of this transaction',
  txId: 'The unique identifier assigned to this transaction',
  txStatus: 'The status of the Accumulate transaction',
  adiUrl: 'The URL of the ADI (Accumulate Digital Identifier)',
  identityUrl: 'The URL of the Light Identity',
  adiDirectory: 'a way of organizing accounts within an ADI',
  pubKey: 'The Public Key of the ADI',
  amount: 'The number of tokens transferred',
  keyBookUrl:
    'The Url of the keybook (store the Hierarchical Key Management Structure of an ADI using Key Pages and Keys within those pages.) ',
  keyBook:
    'store the Hierarchical Key Management Structure of an ADI using Key Pages and Keys within those pages.',
  keyPageUrl:
    'The URL of the Keypage (defines the set of Keys required to validate a transaction)',
  keyData: 'defines the set of Keys required to validate a transaction',
  keyType:
    'The type of Key defined as the hash of the public key for a signature',
  nonce: 'number added to a hashed or encrypted—block in a blockchain',
  sponsor: 'The URL of the principal',
  expireAtTime:
    'The deadline after which the transaction expires if it is still pending',
  additionalAuthority:
    'An additional authority required to sign the transaction',
  recipient: 'the account that is receiving a transaction',
  threshold: 'the required m of n to execute a transaction',
  maxSupply:
    'The maximum amount of tokens coded to exist in the lifetime of the cryptocurrency.',
  totalSupply: 'The amount of tokens that have already been created.',
  circAcmeSupply:
    'The amount of ACME that are circulating in the market, calculated as total supply minus ACME owned by the Accumulate Foundation.',
  stakingType: 'Type of the staking',
  stakingRewards: 'Token account where staking rewards are deposited',
  cause: 'The cause of the transaction or signature',
  produced: 'Messages produced in response to this message',
  memo: 'A memo provided by the user',
  metadata: 'Metadata provided by the user',
  timestamp: 'The timestamp of the block in which the transaction was executed',
  block: 'The block in which the transaction was executed',

  web3: {
    connect:
      'Connect Web3 wallet to sign and submit txs on the Accumulate Network',

    disconnect: 'Disconnect Web3 wallet',

    toggleDashboard: 'Open or close the Web3 dashboard',

    liteIdentity:
      'Accumulate Lite Identity is an account associated with your Ethereum key',

    credits:
      'Credits are used to pay for network transactions. You can add credits by converting ACME tokens.',

    backup:
      'Backup Account is a lite data account used to backup your settings',

    keyPageEntry: 'This is your Web3 key',
  },
};

export default tooltip;
