# CryptoLens

Painel público de inteligência e acompanhamento de criptomoedas.

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Verificação

```bash
pnpm build
```

## Dados e privacidade

- Preços, volume e histórico usam endpoints públicos da Binance Spot. Depois
  da carga inicial, os ativos monitorados recebem atualizações em tempo real
  pelo stream público da Binance enquanto a aba está visível. A consulta REST
  de recuperação ocorre no máximo uma vez por minuto.
- Indicadores globais usam CoinGecko e Alternative.me; tendências usam
  CoinGecko. Se uma fonte estiver indisponível ou o navegador estiver offline,
  o site mostra o estado correspondente e não substitui dados ausentes por
  valores estimados.
- Watchlist, alertas, carteira e conversas deste protótipo são armazenados
  somente no `localStorage` do navegador. Não há envio desses dados a um
  servidor.
- Notícias verificáveis, comunidade multiusuário, notificações em segundo
  plano e integração com corretoras dependem de backend, autenticação e fontes
  licenciadas. Nenhuma chave, token ou credencial deve ser adicionada ao site
  estático.

## Publicação

O GitHub é a fonte de verdade do projeto. Atualizações enviadas para a branch
`main` são compiladas e publicadas automaticamente pelo GitHub Pages.

> Os dados da carteira atualmente ficam no armazenamento local do navegador.
> O repositório hospeda o código e o site estático; ele não substitui um banco
> de dados ou servidor de API.
