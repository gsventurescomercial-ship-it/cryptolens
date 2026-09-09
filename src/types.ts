export type MarketAsset = {
  symbol: string
  name: string
  price: number
  change: number
  volume: number
  marketCap?: string
  color: string
}

export type DemoUser = {
  email: string
  name: string
}

export type TransactionKind = 'send' | 'receive' | 'swap'
