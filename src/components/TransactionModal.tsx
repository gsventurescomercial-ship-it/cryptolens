import { useMemo, useState } from 'react'
import type { MarketAsset, TransactionKind } from '../types'

const demoBalances: Record<string, number> = { BTC: 0.0824, ETH: 1.47, SOL: 18.2 }

export default function TransactionModal({ kind, assets, onClose }: { kind: TransactionKind; assets: MarketAsset[]; onClose: () => void }) {
  const [asset, setAsset] = useState('BTC')
  const [targetAsset, setTargetAsset] = useState('ETH')
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [complete, setComplete] = useState(false)
  const [copied, setCopied] = useState(false)
  const source = assets.find((item) => item.symbol === asset)
  const target = assets.find((item) => item.symbol === targetAsset)
  const estimate = useMemo(() => {
    const value = Number(amount)
    if (!source?.price || !target?.price || !value) return 0
    return value * source.price / target.price
  }, [amount, source?.price, target?.price])
  const demoAddress = `demo_${asset.toLowerCase()}_nao_envie_fundos_7F4A91`
  const titles: Record<TransactionKind, string> = { send: 'Enviar cripto', receive: 'Receber cripto', swap: 'Trocar ativos' }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (kind === 'receive' || Number(amount) > 0 && (kind === 'swap' || address.trim())) setComplete(true)
  }

  const copyDemoAddress = async () => {
    await navigator.clipboard.writeText(demoAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return <div className="wallet-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="transaction-modal" role="dialog" aria-modal="true" aria-label={titles[kind]} onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span>WALLET DEMONSTRATIVA</span><h2>{titles[kind]}</h2></div><button onClick={onClose} aria-label="Fechar transação">×</button></header>
    {complete ? <div className="transaction-success" role="status"><span>✓</span><h3>Simulação concluída</h3><p>Nenhum ativo foi movimentado e nenhuma ordem foi enviada. Este fluxo existe apenas para demonstrar a experiência da wallet.</p><button className="wallet-primary" onClick={onClose}>Voltar ao dashboard</button></div> : <form onSubmit={submit}>
      <div className="simulation-warning"><b>Modo simulação</b><span>Não conecte uma carteira real e não envie fundos.</span></div>
      {kind === 'receive' ? <>
        <label>Ativo<select value={asset} onChange={(event) => setAsset(event.target.value)}>{assets.slice(0, 3).map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>
        <div className="demo-qr" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
        <label>Endereço inválido de demonstração<div className="address-copy"><input readOnly value={demoAddress}/><button type="button" onClick={copyDemoAddress}>{copied ? 'Copiado' : 'Copiar'}</button></div></label>
        <button className="wallet-primary" type="submit">Entendi, concluir simulação</button>
      </> : <>
        <div className="asset-field-row"><label>Você {kind === 'send' ? 'envia' : 'troca'}<select value={asset} onChange={(event) => { setAsset(event.target.value); if (event.target.value === targetAsset) setTargetAsset(event.target.value === 'BTC' ? 'ETH' : 'BTC') }}>{assets.slice(0, 3).map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>{kind === 'swap' && <label>Você recebe<select value={targetAsset} onChange={(event) => setTargetAsset(event.target.value)}>{assets.slice(0, 3).filter((item) => item.symbol !== asset).map((item) => <option key={item.symbol}>{item.symbol}</option>)}</select></label>}</div>
        <label>Quantidade<div className="amount-input"><input type="number" min="0" step="any" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00"/><button type="button" onClick={() => setAmount(String(demoBalances[asset] ?? 0))}>Máx.</button></div><small>Saldo demo: {demoBalances[asset] ?? 0} {asset}</small></label>
        {kind === 'send' && <label>Endereço de destino<input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Cole um endereço apenas para simular"/><small>O endereço não será validado nem transmitido.</small></label>}
        {kind === 'swap' && <div className="swap-estimate"><span>Estimativa pelas cotações públicas atuais</span><b>{estimate ? `≈ ${estimate.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ${targetAsset}` : 'Informe uma quantidade'}</b><small>Sem taxa real, slippage ou execução on-chain.</small></div>}
        <button className="wallet-primary" type="submit">Simular {kind === 'send' ? 'envio' : 'swap'}</button>
      </>}
    </form>}
  </section></div>
}
