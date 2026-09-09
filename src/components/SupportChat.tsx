import { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'assistant' | 'user'; text: string }

function supportReply(question: string) {
  const text = question.toLowerCase()
  if (text.includes('taxa') || text.includes('fee')) return 'Neste protótipo, envios e swaps são apenas simulações e não cobram taxas. Em uma wallet real, confira a taxa de rede, a taxa do serviço e o valor final antes de confirmar.'
  if (text.includes('segur') || text.includes('senha') || text.includes('seed')) return 'Nunca compartilhe sua seed phrase, chave privada ou código de autenticação. O CryptoLens demo não solicita esses dados. A senha local deve ser exclusiva e diferente da senha de sua exchange.'
  if (text.includes('depósito') || text.includes('deposito') || text.includes('receber')) return 'O endereço exibido na área Receber é deliberadamente inválido e serve apenas para demonstrar o fluxo. Não envie fundos para ele. Uma integração real exigiria uma wallet e validação da rede selecionada.'
  if (text.includes('swap') || text.includes('trocar')) return 'O Swap usa as cotações públicas apenas para estimar a conversão. Ele não considera slippage, liquidez, taxa de rede ou imposto e não executa nenhuma operação.'
  if (text.includes('preço') || text.includes('preco') || text.includes('cotação')) return 'As cotações monitoradas vêm dos endpoints e do stream público da Binance Spot. Quando a fonte fica indisponível, o painel mostra essa condição em vez de inventar valores.'
  if (text.includes('comprar') || text.includes('investir')) return 'Posso ajudar você a montar uma checklist de pesquisa, mas não indicar uma compra. Antes de investir, avalie fundamentos, tokenomics, segurança, liquidez, regulação, horizonte e quanto você aceita perder.'
  return 'Posso explicar taxas, segurança, depósitos simulados, swaps, cotações e boas práticas de pesquisa. Para análises dos ativos monitorados, abra o CryptoLens AI no menu lateral.'
}

export default function SupportChat() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [typing, setTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', text: 'Olá! Sou o suporte CryptoLens. Como posso ajudar com a wallet demonstrativa?' }])
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, typing])

  const send = (event: React.FormEvent) => {
    event.preventDefault()
    const value = question.trim()
    if (!value || typing) return
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', text: value }])
    setQuestion('')
    setTyping(true)
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: 'assistant', text: supportReply(value) }])
      setTyping(false)
    }, 700)
  }

  return <aside className={`support-widget ${open ? 'open' : ''}`} aria-label="Suporte CryptoLens">
    {open && <section className="support-window">
      <header><div><span className="support-avatar">✦</span><span><b>Suporte CryptoLens</b><small><i/> Assistente online</small></span></div><button onClick={() => setOpen(false)} aria-label="Fechar suporte">×</button></header>
      <div className="support-log" ref={logRef} aria-live="polite">{messages.map((message) => <article className={message.role} key={message.id}>{message.text}</article>)}{typing && <div className="typing-indicator"><i/><i/><i/><span>IA digitando…</span></div>}</div>
      <div className="support-shortcuts"><button onClick={() => setQuestion('Como funcionam as taxas?')}>Taxas</button><button onClick={() => setQuestion('Como proteger minha wallet?')}>Segurança</button><button onClick={() => setQuestion('Como receber um depósito?')}>Depósitos</button></div>
      <form onSubmit={send}><input value={question} onChange={(event) => setQuestion(event.target.value)} aria-label="Mensagem para o suporte" placeholder="Digite sua dúvida…"/><button type="submit" disabled={typing || !question.trim()} aria-label="Enviar mensagem">➜</button></form>
      <small className="support-disclaimer">Respostas automáticas locais. Nenhum dado é enviado a uma API.</small>
    </section>}
    <button className="support-launcher" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Fechar chat de suporte' : 'Abrir chat de suporte'}><span>{open ? '×' : '✦'}</span>{!open && <i/>}</button>
  </aside>
}
