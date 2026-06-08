# ARKEflow — Convenção de Exibição de Atributos de Variação

> Atualizado em 2026-06-07. Referência obrigatória para todas as telas que exibem atributos de produto.

---

## 1. Ordem canônica de importância

```
Tipo → Tamanho → Cor → Composição → Medidas
```

> **Nota:** `Tipo` e `Composição` são campos no nível do produto, **não** estão em `atributos_json`. As telas que os possuem os exibem separadamente. O helper `atributos.ts` trata apenas `atributos_json`.

---

## 2. Onde vivem os dados

Os atributos de variação ficam em `atributos_json: Record<string, string>` no objeto de versão/item.

Chaves catalogadas (primárias): `'Tamanho'` e `'Cor'` — exatamente estes strings.
Qualquer outra chave é uma **medida** (ex.: `'Quadril'`, `'Largura da Barra / Punho'`).

---

## 3. Padrão de exibição em contextos compactos

Em contextos de espaço reduzido (linha do carrinho, resumo de venda expandido, relatórios futuros), exibir **somente os valores** dos atributos primários, **sem labels**, na ordem canônica:

```
Tamanho → Cor
```

Exemplo: produto com Tamanho=50, Cor=Caramelo → exibe `50 · Caramelo`
Apenas Tamanho=M → exibe `M`
Nenhum atributo → exibe `Versão única` (ou nada, conforme o contexto)

---

## 4. Tooltip de detalhes ("+" affordance)

Junto dos chips inline, exibir um chip `+` quando houver atributos além do que foi mostrado inline (medidas ou, futuramente, outros casos). Ao hover, abrir um tooltip com:

1. **Header:** "Detalhes da variação"
2. **Seção Principais:** linhas `label: valor` para Tamanho e Cor que existirem
3. **Divisor** (omitir se não houver medidas)
4. **Seção Medidas:** sub-header "Medidas" + linhas `label: valor`, em ordem de inserção no objeto

Omitir grupos vazios.

### Estilo do tooltip

```
background:    rgb(10, 22, 34)          /* opaco */
border:        0.5px solid rgba(255,255,255,0.14)
border-radius: 9px
shadow:        0 4px 16px rgba(0,0,0,0.5)
min-width:     200px
```

Labels em `rgba(255,255,255,0.4)` (Steel), valores em `rgba(255,255,255,0.85)` (Sea Foam).

### Interação

- **Desktop/painel:** hover no chip `+` abre o tooltip.
- **Touch (futuro):** o chip `+` vira tap-to-open quando o build tablet/desktop-app chegar.

---

## 5. Utilitário compartilhado

**Todas as telas que exibem atributos de produto DEVEM usar:**

```
apps/web/lib/utils/atributos.ts
```

Funções exportadas:

| Função | Uso |
|--------|-----|
| `atributosInline(attrs)` | Retorna `string[]` com valores dos primários (Tamanho, Cor), nessa ordem, sem labels. |
| `atributosCompletos(attrs)` | Retorna `{ principais: AtributoLinha[], medidas: AtributoLinha[] }` para o tooltip. |

Usar estas funções garante que a ordem e o estilo sejam idênticos em todo o sistema.

---

## 6. Telas que já seguem este padrão

| Tela | Arquivo |
|------|---------|
| Linha do carrinho (caixa) | `apps/web/app/(painel)/painel/caixa/page.tsx` |
| Resumo do turno — venda expandida | `apps/web/app/(painel)/painel/caixa/resumo/page.tsx` |
