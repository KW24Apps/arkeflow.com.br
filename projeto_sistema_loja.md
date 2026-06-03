# Projeto — Sistema de Gestão para Lojas de Varejo

## Visão geral

Sistema de gestão voltado para pequenas lojas de varejo — roupas, calçados, cosméticos, acessórios de celular e similares. O foco é simplicidade, mobilidade e custo acessível para o lojista pequeno.

O sistema precisa funcionar online e offline ao mesmo tempo. Online para acesso remoto, relatórios e sincronização. Offline para garantir que a loja continue operando mesmo sem internet — as vendas são salvas localmente e sincronizadas quando a conexão voltar.

O vendedor usa o sistema pelo celular. O dono acessa o painel de gestão pelo navegador, de qualquer lugar.

---

## Stack tecnológica

- **Frontend:** Next.js + React
- **Backend:** Node.js
- **Banco de dados:** PostgreSQL
- **Servidor:** VPS Linux (8GB RAM, 2 núcleos, 250GB SSD)
- **Emissão de notas fiscais:** API terceirizada (Focus NFe ou eNotas) — não desenvolver internamente

Toda a stack é JavaScript. Frontend, backend e integrações usam a mesma linguagem.

---

## Arquitetura de bancos

### Banco da plataforma (administrativo)
Um único banco central que pertence ao sistema. Armazena:
- Cadastro das lojas clientes
- Planos e assinaturas
- Pacotes de nota fiscal comprados
- Todos os usuários do sistema (de todos os níveis)

### Banco de cada loja (cliente)
Cada loja tem seu próprio banco isolado. O campo `banco_id` na tabela `lojas` aponta para o banco daquela loja. Nenhuma loja acessa dados de outra.

---

## Níveis de usuário

Todos os usuários ficam no banco da plataforma. O campo `loja_id` os vincula à loja deles. O campo `nivel` define o acesso:

- `admin_plataforma` — acesso total ao sistema (você)
- `parceiro` — vê apenas seus clientes cadastrados (futuro)
- `dono_loja` — acesso completo à loja dele
- `vendedor` — acesso apenas ao PDV e consulta de estoque

Novos clientes entram com o dono como primeiro usuário. O dono cadastra os vendedores.

---

## Modelo de negócio

- Cobrança mensal por loja — valor base em torno de R$ 99–120
- Notas fiscais como módulo separado — pacotes de quantidade (ex: 100 notas, 500 notas)
- Planos com funcionalidades diferentes (ex: plano básico sem financeiro, plano completo com cashback e promoções)
- Futuro: portal de parceiros para revenda

---

## Estrutura de banco — plataforma

### lojas
Cadastro das lojas clientes.
- id, nome, cnpj, telefone, email, banco_id, status, criado_em

### planos
Planos disponíveis no sistema.
- id, nome, preco_mensal, max_usuarios, franquia_notas, tem_financeiro, tem_cashback, tem_promocoes

### assinaturas
Vínculo entre loja e plano ativo.
- id, loja_id (FK), plano_id (FK), inicio, vencimento, status

### pacotes_nota
Pacotes de notas fiscais comprados pela loja.
- id, loja_id (FK), quantidade, utilizadas, valor_pago, validade

### usuarios
Todos os usuários de todos os níveis.
- id, loja_id (FK), nome, email, senha_hash, nivel, ativo, ultimo_acesso

---

## Estrutura de banco — loja (cada cliente)

### produtos
Cadastro principal do produto.
- id, nome, categoria, marca, descricao, preco_base, foto_url, controle_estoque, ativo
- O campo `controle_estoque` quando desativado ignora quantidades em todo o sistema

### atributos_produto
Define quais atributos aquele produto usa (tamanho, cor, modelo, etc).
- id, produto_id (FK), nome
- Existe para o sistema saber quais filtros mostrar sem precisar varrer todas as versões

### versoes
Cada combinação de atributos de um produto. Ex: Camiseta Grêmio tamanho P cor Azul.
- id, produto_id (FK), atributos_json, preco_especifico, estoque_atual, estoque_minimo, ativo
- `atributos_json` guarda os valores preenchidos ex: {"tamanho":"P","cor":"Azul"}
- `preco_especifico` é opcional — se vazio usa o preco_base do produto
- O lojista preenche apenas os atributos que fazem sentido para aquele produto

### regras_cashback
Regras de cashback cadastradas pelo administrador da loja.
- id, nome, percentual, padrao, ativo
- Apenas uma regra pode ser marcada como padrão
- Clientes novos entram automaticamente com a regra padrão

### clientes
Cadastro de clientes da loja.
- id, nome, telefone, cpf, email, regra_cashback_id (FK), saldo_cashback, criado_em

### historico_cashback
Registro de cada entrada e saída de cashback por cliente.
- id, cliente_id (FK), venda_id (FK), tipo, valor, criado_em
- `tipo`: "ganho" (gerado numa compra) ou "resgate" (usado numa venda)

### formas_pagamento
Formas de pagamento disponíveis na loja.
- id, nome, tipo, padrao_sistema, desconto_percentual, desconto_maximo, ativo
- Formas padrão (dinheiro, pix, debito, credito, crediario) têm `padrao_sistema = true` e não podem ser excluídas
- O lojista pode cadastrar formas personalizadas (ex: bitcoin, vale-troca)
- `desconto_percentual` e `desconto_maximo` funcionam juntos — o sistema aplica o menor dos dois. Zero em qualquer campo significa sem limite naquele campo.

### promocoes
Regras de promoção independentes dos produtos.
- id, nome, tipo, valor_desconto, unidade, quantidade_minima, quantidade_brinde, percentual_brinde, inicio, fim, categoria_alvo, ativo
- `tipo`: desconto_fixo, desconto_percentual, compre_ganhe, segunda_peca, categoria
- Pode ser vinculada a produtos específicos ou a uma categoria inteira

### promocoes_produtos
Vínculo entre promoção e produtos específicos.
- id, promocao_id (FK), produto_id (FK)

### vendas
Registro de cada venda realizada.
- id, cliente_id (FK), usuario_id, promocao_id (FK), subtotal, desconto_promocao, desconto_pagamento, cashback_usado, total, cashback_gerado, status, criado_em
- Os descontos são separados por origem para permitir relatórios precisos

### itens_venda
Produtos que compõem a venda.
- id, venda_id (FK), versao_id (FK), quantidade, preco_unitario, desconto_item

### pagamentos_venda
Formas de pagamento usadas em cada venda. Uma venda pode ter mais de uma.
- id, venda_id (FK), forma_pagamento_id (FK), valor, parcelas, detalhe
- Exemplo: R$ 50 PIX + R$ 100 crédito na mesma venda

### parcelas_crediario
Parcelas geradas quando a forma de pagamento é crediário.
- id, pagamento_venda_id (FK), numero_parcela, valor, vencimento, pago_em, status
- `status`: pendente, pago, vencido
- Só é criada quando a forma de pagamento for crediário

### notas_fiscais
Notas emitidas via API terceirizada vinculadas à venda.
- id, venda_id (FK), tipo, numero, chave_acesso, status, xml_url, emitida_em

### lancamentos
Fluxo de caixa da loja.
- id, tipo, descricao, valor, venda_id (FK), data, categoria, status
- `tipo`: entrada ou saida
- `status`: realizado ou pendente
- Toda venda finalizada gera um lançamento de entrada automaticamente
- Despesas são lançadas manualmente pelo dono ou gerente

---

## Regras de negócio principais

**Preço de versão:** usa `preco_especifico` da versão se preenchido. Se vazio, usa `preco_base` do produto.

**Desconto por forma de pagamento:** o sistema aplica automaticamente no PDV. O vendedor não interfere. Se `desconto_percentual` e `desconto_maximo` estiverem ambos preenchidos, aplica o menor valor resultante.

**Cashback:** calculado sobre o total da venda conforme a regra vinculada ao cliente. Registrado no histórico a cada compra. Pode ser resgatado em compras futuras.

**Crediário:** gera parcelas individuais na tabela `parcelas_crediario`. O dono acompanha o que está em aberto, vencido e pago.

**Controle de estoque:** quando desativado no produto, o sistema ignora quantidades em todo o fluxo — PDV, relatórios e alertas de estoque mínimo.

**Offline:** vendas realizadas sem internet são salvas localmente e sincronizadas com o servidor quando a conexão voltar. A sincronização precisa tratar conflitos de estoque.

**Notas fiscais:** emitidas via API terceirizada. O sistema envia os dados da venda e recebe o XML e a chave de acesso. Toda a burocracia fiscal fica por conta da API contratada.

---

## Fases de desenvolvimento

### Fase 1 — MVP para venda (prioridade máxima)
- Cadastro de produtos com versões e atributos flexíveis
- Controle de estoque
- Cadastro de clientes
- PDV no celular (sacola virtual, leitura de QR code, fechamento de venda)
- Formas de pagamento com políticas de desconto
- Crediário com controle de parcelas
- Emissão de NF-e e NFC-e via API
- Fluxo de caixa básico (entradas automáticas, saídas manuais)
- Painel do dono com relatórios básicos
- Funcionamento offline com sincronização

### Fase 2 — Fidelização e promoções
- Cashback com regras configuráveis
- Painel de promoções (desconto, compre e ganhe, segunda peça)
- Histórico de compras por cliente
- Relatórios avançados

### Fase 3 — Escala e parceiros
- Portal de parceiros para revenda
- Cobrança automática de mensalidade
- White-label básico para o lojista

---

## Observações para o desenvolvimento

- Cada loja tem seu próprio banco PostgreSQL isolado. A criação do banco da loja deve ser automática no momento do cadastro da loja.
- A autenticação é feita no banco da plataforma. Após login, o sistema identifica a loja e o nível do usuário e abre o banco correto.
- O app do vendedor deve ser uma PWA (Progressive Web App) — funciona no celular via navegador, sem precisar instalar nada, e suporta modo offline via IndexedDB.
- O painel do dono é web, acessível de qualquer dispositivo.
- Não desenvolver nada relacionado a legislação fiscal — usar exclusivamente API terceirizada para emissão de notas.
