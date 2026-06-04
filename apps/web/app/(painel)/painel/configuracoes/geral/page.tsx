import { TopBar } from '@/components/layout/TopBar'

export default function ConfiguracoesGeralPage() {
  return (
    <>
      <TopBar title="Configurações Gerais" />
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-lg flex flex-col gap-4">

          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl">⚙️</span>
            <h2 className="text-sea-foam font-semibold text-lg">Configurações da Loja</h2>
            <p className="text-steel text-sm leading-relaxed">
              Esta seção está em desenvolvimento. Em breve você poderá configurar:
            </p>
            <ul className="text-steel text-sm text-left space-y-2 w-full max-w-xs">
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Logo e identidade visual da loja</li>
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Dados da empresa (nome, CNPJ, endereço)</li>
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Controle de estoque global</li>
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Configurações de notificações</li>
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Integração com API de nota fiscal</li>
              <li className="flex items-start gap-2"><span className="text-electric-cyan mt-0.5">·</span> Portal do cliente</li>
            </ul>
          </div>

          <a href="/painel/cadastros/configuracoes"
            className="min-h-[48px] bg-ocean-depth text-sea-foam rounded-2xl text-sm font-medium flex items-center justify-center hover:bg-teal-current transition-colors">
            Ver Controle de Estoque Global →
          </a>

        </div>
      </main>
    </>
  )
}
