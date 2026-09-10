import './globals.css'

export const metadata = {
  title: 'CryptoLens',
  description: 'Acompanhamento de portfólio cripto com dados de mercado e IA educativa.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
