'use client'

import { useState } from 'react'
import { requireSupabase } from '../lib/supabaseClient'

export default function ChatIA({ portfolio, marketContext, riskProfile = 'não informado' }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Posso analisar sua carteira usando apenas os dados de mercado fornecidos pelo CryptoLens. Não executo nenhuma operação.' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const value = question.trim()
    if (!value || loading) return

    setMessages((current) => [...current, { role: 'user', text: value }])
    setQuestion('')
    setError('')
    setLoading(true)

    try {
      const supabase = requireSupabase()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) throw new Error('Entre na sua conta para usar a análise da IA.')

      const response = await fetch('/api/ai-analise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ portfolio, marketContext, riskProfile, question: value }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a análise.')
      setMessages((current) => [...current, { role: 'assistant', text: payload.resposta }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao consultar a IA.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel ai-panel">
      <div className="panel-heading"><div><span className="eyebrow">CRYPTOLENS AI</span><h2>Análise educativa</h2></div><span className="secure-pill">Servidor</span></div>
      <p className="muted">A IA apenas sugere e explica. Comprar, vender ou rebalancear continua sendo uma decisão exclusiva do usuário.</p>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>{message.text}</div>
        ))}
        {loading && <div className="chat-bubble assistant loading-line">Analisando portfólio e contexto de mercado…</div>}
      </div>
      {error && <div className="async-state error" role="alert">{error}</div>}
      <form className="chat-form" onSubmit={submit}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: minha carteira está muito concentrada?" disabled={loading} />
        <button className="primary-button" type="submit" disabled={loading || !question.trim()}>{loading ? 'Analisando…' : 'Enviar'}</button>
      </form>
    </section>
  )
}
