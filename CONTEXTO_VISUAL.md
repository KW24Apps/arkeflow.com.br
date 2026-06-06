# ARKEflow — Contexto Visual (Design System)

> Criado em 2026-06-06. Referência para todos os componentes e padrões visuais do painel.

---

## 1. Design System — Ocean Glass

Todas as telas do painel seguem o padrão **Ocean Glass**: fundos escuros translúcidos com bordas sutis e destaque em cyan elétrico.

### Paleta de cores

| Token | Valor | Uso |
|-------|-------|-----|
| Accent / Electric Cyan | `#0ef` | Botão primário, bordas de foco, valores principais |
| Midnight | `rgba(8,10,20,1)` | Fundo base |
| Deep Ocean | `rgba(8,18,30,0.48)` | Cards e modais |
| Ocean Depth | `rgba(255,255,255,0.09)` | Bordas padrão |
| Sea Foam | `rgba(255,255,255,0.85)` | Texto principal |
| Steel | `rgba(255,255,255,0.35)` | Labels e texto secundário |
| Mint Green | `rgba(100,220,160,0.9)` | Sucesso, cashback, troco |
| Danger | `rgba(240,100,100,0.75)` | Erros, ações destrutivas |

### Cards (Ocean Glass)

```css
background: rgba(8,18,30,0.48);
backdrop-filter: blur(12px);
border: 0.5px solid rgba(255,255,255,0.09);
border-radius: 10px;
```

### Inputs e Selects

```css
background: rgba(8,18,30,0.5);
border: 0.5px solid rgba(255,255,255,0.12);
border-radius: 8px;
color: rgba(255,255,255,0.75);
/* foco: */
border-color: rgba(0,239,255,0.4);
```

### Labels de campo

```css
font-size: 9px;
color: rgba(255,255,255,0.35);
text-transform: uppercase;
letter-spacing: 0.1em;
```

### Botões

| Tipo | Estilo |
|------|--------|
| Primário (salvar) | `background: rgba(0,239,255,0.85); color: #0a0a1a; font-weight: 600;` |
| Perigo | `background: rgba(240,100,100,0.08); border: 0.5px solid rgba(240,100,100,0.25); color: rgba(240,130,130,0.75);` |
| Secundário | `background: rgba(255,255,255,0.06); border: 0.5px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.5);` |

---

## 2. Layout padrão das telas

### Regra geral

Todas as telas: **full width**, sem `max-w` constraint.

### Telas de listagem

- Linhas de vidro (`glass rows`) + busca em tempo real client-side + FAB fixo no canto inferior direito

### Telas de edição/criação

```jsx
<main className="flex-1 overflow-hidden flex flex-col">
  <div className="shrink-0">/* cabeçalho compacto */</div>
  <div className="flex-1 overflow-y-auto p-3">
    <div className="grid grid-cols-2 gap-3">/* campos */</div>
  </div>
  <div className="shrink-0">/* rodapé fixo com botões */</div>
</main>
```

### PDV / Caixa (split panel)

```
┌─────────────────────┬──────────────┐
│  Lista de itens     │ Sidebar 240px│
│  (flex-1, scroll)   │ (4 módulos)  │
│                     │              │
│  ─── input scan ─── │              │
└─────────────────────┴──────────────┘
```

---

## 3. Componentes Reutilizáveis

### GlassSelect

Localização: `apps/web/components/ui/GlassSelect.tsx`

Select estilizado no padrão Ocean Glass com suporte a `label`, `error` e `disabled`.

```tsx
<GlassSelect label="Tipo" value={...} onChange={...}>
  <option value="a">Opção A</option>
</GlassSelect>
```

### CurrencyInput

Localização: definido inline em `apps/web/app/(painel)/painel/caixa/page.tsx`

Entrada de valor monetário com digitação **right-to-left** (centavos). Cada dígito digitado desloca os anteriores uma casa para a esquerda; Backspace remove o último centavo. Não aceita digitação livre de texto — apenas eventos de teclado.

```tsx
<CurrencyInput
  value={cents}          // número inteiro de centavos
  onChange={setCents}    // (cents: number) => void
  onEnter={handleNext}   // opcional — Enter avança o foco
  autoFocus
  placeholder="R$ 0,00"
  className="..."
/>
```

Usado em: saldo inicial de abertura, valor de sangria/suprimento, saldo de fechamento.

### CustomerSearchModal

Localização: `apps/web/components/pdv/CustomerSearchModal.tsx`

Modal grande (max-w-2xl) de busca de cliente. Exibe múltiplos telefones e e-mails, saldo de cashback, total de compras. Fecha ao clicar no backdrop.

Props: `open`, `onClose`, `onSelect`, `autoAberto` (controla se exibe botão "Pular").

### SalespersonSearchModal

Localização: `apps/web/components/pdv/SalespersonSearchModal.tsx`

Modal de busca de vendedor com filtro por tipo (todos / ativos). Mesmo tamanho e padrão visual do CustomerSearchModal.

### CheckoutModal

Localização: `apps/web/components/pdv/CheckoutModal.tsx`

Modal de finalização de venda. Suporta:
- Múltiplos métodos de pagamento em sequência (parcial → próximo método)
- Slider de desconto por forma de pagamento (limitado por `desconto_percentual` e `desconto_maximo` da forma)
- Cálculo de troco em tempo real (somente para `tipo === 'dinheiro'`)
- Validação: não-dinheiro não pode exceder `restanteComDescontoAtual`
- Reset completo do estado ao chamar `onSuccess` (evita freeze pós-venda)

---

## 4. Padrões de Modal

### Estrutura base

```tsx
<div className="fixed inset-0 bg-midnight/90 z-50 flex items-center justify-center p-4"
     onClick={onClose}>
  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md"
       onClick={e => e.stopPropagation()}>
    {/* conteúdo */}
  </div>
</div>
```

Todos os modais fecham ao clicar no backdrop (`onClick={onClose}` no overlay + `stopPropagation` no conteúdo).

### Modal de seleção de variação (PDV)

Grid `auto-fill minmax(100px, 1fr)`. Cards com estado `focado` (borda cyan) e `esgotado` (opacidade 35%, cursor not-allowed). Navegação por teclado: ← → para navegar, Enter para adicionar, Esc para fechar.

### Modal de boas-vindas (abertura de caixa)

Auto-dismiss após 10 segundos. Clique no backdrop fecha imediatamente. Mensagem em duas partes: saudação aleatória (PARTE1) + frase motivacional aleatória (PARTE2). Exibe hora de abertura e saldo inicial.

---

## 5. TopBar — User Dropdown

O dropdown do usuário usa fundo **completamente opaco** para não deixar o conteúdo da página aparecer atrás:

```css
background: rgb(8,18,30);   /* sem transparência */
border: 0.5px solid rgba(255,255,255,0.12);
border-radius: 10px;
```

Ícones do dropdown: `lucide-react` (`User`, `LogOut`, etc.).

---

## 6. Atributos de variação — exibição

Atributos de uma versão são exibidos como chips inline separados por ponto médio:

```
Cor: Azul · Tamanho: M
```

Implementado em `caixa/page.tsx` e `resumo/page.tsx` com:

```tsx
Object.entries(item.atributos).map(([key, val]) => (
  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px',
    padding: '2px 7px' }}>
    {key}: <strong>{val}</strong>
  </span>
))
```
