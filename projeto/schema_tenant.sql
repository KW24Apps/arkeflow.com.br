--
-- PostgreSQL database dump
--

\restrict pyS4E24N2IfbBfPcul5cZQriSBwtANK9bM32z2oSpi0SnsXD9ALLWSGwU7LgZLm

-- Dumped from database version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._migrations (
    name text NOT NULL,
    run_at timestamp with time zone DEFAULT now()
);


--
-- Name: ajustes_estoque; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ajustes_estoque (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    versao_id uuid NOT NULL,
    tipo text NOT NULL,
    quantidade integer NOT NULL,
    motivo text,
    usuario_id uuid NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ajustes_estoque_tipo_check CHECK ((tipo = ANY (ARRAY['entrada'::text, 'saida'::text, 'ajuste'::text])))
);


--
-- Name: atributos_produto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.atributos_produto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    produto_id uuid NOT NULL,
    nome text NOT NULL
);


--
-- Name: autorizacoes_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autorizacoes_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_operador_id uuid NOT NULL,
    acao text NOT NULL,
    metodo text NOT NULL,
    supervisor_id uuid,
    autorizado_por text,
    autorizado_nome text,
    justificativa text,
    turno_id uuid,
    detalhe jsonb DEFAULT '{}'::jsonb NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT autorizacoes_log_metodo_check CHECK ((metodo = ANY (ARRAY['senha_mestra'::text, 'supervisor'::text])))
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    telefone text,
    cpf text,
    email text,
    regra_cashback_id uuid,
    saldo_cashback numeric(10,2) DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    medidas_json jsonb DEFAULT '{}'::jsonb,
    arquivado boolean DEFAULT false NOT NULL,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado character(2)
);


--
-- Name: clientes_contatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes_contatos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cliente_id uuid NOT NULL,
    tipo text NOT NULL,
    nome text NOT NULL,
    telefone text,
    email text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT clientes_contatos_tipo_check CHECK ((tipo = ANY (ARRAY['comercial'::text, 'financeiro'::text, 'socio'::text])))
);


--
-- Name: clientes_credito; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes_credito (
    cliente_id uuid NOT NULL,
    credito_liberado boolean DEFAULT false NOT NULL,
    limite numeric(10,2) DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: composicoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.composicoes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: configuracoes_loja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_loja (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    controle_estoque boolean DEFAULT true NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    link_loja text,
    desconto_max_percentual numeric(5,2) DEFAULT 0 NOT NULL,
    desconto_max_valor numeric(10,2) DEFAULT 0 NOT NULL,
    promocao_aceita_desconto boolean DEFAULT false NOT NULL,
    desconto_restringe_formas boolean DEFAULT false NOT NULL,
    crediario_max_parcelas integer DEFAULT 1 NOT NULL,
    crediario_entrada_obrigatoria boolean DEFAULT false NOT NULL,
    crediario_entrada_min_pct numeric(5,2) DEFAULT 0 NOT NULL,
    crediario_juros_habilitado boolean DEFAULT false NOT NULL,
    crediario_juros_sem_ate integer DEFAULT 0 NOT NULL,
    crediario_juros_mes numeric(5,2) DEFAULT 0 NOT NULL,
    crediario_atraso_habilitado boolean DEFAULT false NOT NULL,
    crediario_atraso_multa numeric(5,2) DEFAULT 0 NOT NULL,
    crediario_atraso_mora_mes numeric(5,2) DEFAULT 0 NOT NULL,
    crediario_formas_entrada jsonb DEFAULT '[]'::jsonb NOT NULL,
    crediario_formas_parcela jsonb DEFAULT '[]'::jsonb NOT NULL,
    supervisao_habilitada boolean DEFAULT false NOT NULL,
    senha_mestra_habilitada boolean DEFAULT false NOT NULL,
    senha_mestra_hash text,
    exige_auth_fechar_falta boolean DEFAULT false NOT NULL,
    exige_auth_fechar_sobra boolean DEFAULT false NOT NULL,
    exige_auth_cancelar_item boolean DEFAULT false NOT NULL,
    sangria_limite_habilitado boolean DEFAULT false NOT NULL,
    sangria_limite_valor numeric(10,2) DEFAULT 0 NOT NULL,
    sangria_fundo_troco numeric(10,2) DEFAULT 0 NOT NULL,
    sangria_limite_modo text DEFAULT 'avisar'::text NOT NULL,
    atalhos_caixa jsonb DEFAULT '{}'::jsonb NOT NULL,
    cashback_habilitado boolean DEFAULT false NOT NULL,
    cashback_aceita_promocao boolean DEFAULT false NOT NULL,
    cashback_aceita_desconto boolean DEFAULT true NOT NULL,
    cashback_aceita_crediario boolean DEFAULT false NOT NULL,
    cashback_limite_modo text DEFAULT 'livre'::text NOT NULL,
    cashback_limite_percentual numeric(5,2) DEFAULT 0 NOT NULL,
    cashback_carencia_dias integer DEFAULT 0 NOT NULL,
    cashback_validade_meses integer DEFAULT 0 NOT NULL,
    CONSTRAINT configuracoes_loja_cashback_limite_modo_check CHECK ((cashback_limite_modo = ANY (ARRAY['livre'::text, 'percentual'::text]))),
    CONSTRAINT sangria_limite_modo_check CHECK ((sangria_limite_modo = ANY (ARRAY['avisar'::text, 'obrigar'::text])))
);


--
-- Name: cores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    hex_cor text,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: formas_pagamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formas_pagamento (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    padrao_sistema boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    aceita_desconto boolean DEFAULT true NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fornecedores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    razao_social text NOT NULL,
    nome_fantasia text,
    cnpj text,
    email text,
    telefones jsonb DEFAULT '[]'::jsonb NOT NULL,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado text,
    ativo boolean DEFAULT true NOT NULL,
    arquivado boolean DEFAULT false NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: historico_cashback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_cashback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cliente_id uuid NOT NULL,
    venda_id uuid,
    tipo text NOT NULL,
    valor numeric(10,2) NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    disponivel_a_partir_de date,
    expira_em date,
    CONSTRAINT historico_cashback_tipo_check CHECK ((tipo = ANY (ARRAY['ganho'::text, 'resgate'::text])))
);


--
-- Name: itens_venda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_venda (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    venda_id uuid NOT NULL,
    versao_id uuid NOT NULL,
    quantidade integer NOT NULL,
    preco_unitario numeric(10,2) NOT NULL,
    desconto_item numeric(10,2) DEFAULT 0 NOT NULL,
    promocao_nome text
);


--
-- Name: lancamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lancamentos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tipo text NOT NULL,
    descricao text NOT NULL,
    valor numeric(10,2) NOT NULL,
    venda_id uuid,
    data date DEFAULT CURRENT_DATE NOT NULL,
    categoria text,
    status text DEFAULT 'realizado'::text NOT NULL,
    CONSTRAINT lancamentos_status_check CHECK ((status = ANY (ARRAY['realizado'::text, 'pendente'::text]))),
    CONSTRAINT lancamentos_tipo_check CHECK ((tipo = ANY (ARRAY['entrada'::text, 'saida'::text])))
);


--
-- Name: medidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medidas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: movimentos_caixa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimentos_caixa (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    turno_id uuid NOT NULL,
    tipo text NOT NULL,
    valor numeric(10,2) NOT NULL,
    motivo text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimentos_caixa_tipo_check CHECK ((tipo = ANY (ARRAY['sangria'::text, 'suprimento'::text])))
);


--
-- Name: notas_fiscais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notas_fiscais (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    venda_id uuid NOT NULL,
    tipo text NOT NULL,
    numero text,
    chave_acesso text,
    status text DEFAULT 'pendente'::text NOT NULL,
    xml_url text,
    emitida_em timestamp with time zone,
    CONSTRAINT notas_fiscais_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'autorizada'::text, 'rejeitada'::text, 'cancelada'::text]))),
    CONSTRAINT notas_fiscais_tipo_check CHECK ((tipo = ANY (ARRAY['nfe'::text, 'nfce'::text])))
);


--
-- Name: pagamentos_venda; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagamentos_venda (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    venda_id uuid NOT NULL,
    forma_pagamento_id uuid NOT NULL,
    valor numeric(10,2) NOT NULL,
    parcelas integer DEFAULT 1 NOT NULL,
    detalhe text,
    valor_recebido numeric(10,2),
    troco numeric(10,2)
);


--
-- Name: parcelas_crediario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parcelas_crediario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pagamento_venda_id uuid NOT NULL,
    numero_parcela integer NOT NULL,
    valor numeric(10,2) NOT NULL,
    vencimento date NOT NULL,
    pago_em date,
    status text DEFAULT 'pendente'::text NOT NULL,
    cliente_id uuid,
    CONSTRAINT parcelas_crediario_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text, 'vencido'::text])))
);


--
-- Name: produtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produtos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    categoria text,
    marca text,
    descricao text,
    preco_base numeric(10,2) NOT NULL,
    foto_url text,
    controle_estoque boolean DEFAULT true NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    tipo_id uuid,
    composicao text,
    descricao2 text,
    composicao_itens jsonb DEFAULT '[]'::jsonb NOT NULL,
    codigo text,
    arquivado boolean DEFAULT false NOT NULL,
    genero text,
    ncm character varying(10),
    cfop character varying(10),
    origem_mercadoria smallint,
    csosn character varying(10),
    cst character varying(10),
    icms_st numeric(5,2),
    ipi numeric(5,2),
    pis numeric(5,2),
    cofins numeric(5,2),
    aceita_desconto boolean DEFAULT true NOT NULL,
    codigo_barras text
);


--
-- Name: promocoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promocoes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    valor_desconto numeric(10,2),
    unidade text,
    quantidade_minima integer,
    quantidade_brinde integer,
    percentual_brinde numeric(5,2),
    inicio date,
    fim date,
    categoria_alvo text,
    ativo boolean DEFAULT true NOT NULL,
    aplicacao text DEFAULT 'produtos_selecionados'::text,
    quantidade_compre integer,
    categorias_alvo jsonb DEFAULT '[]'::jsonb,
    aplica_todos boolean DEFAULT false NOT NULL,
    codigo text,
    encerrada boolean DEFAULT false NOT NULL,
    CONSTRAINT promocoes_aplicacao_check CHECK ((aplicacao = ANY (ARRAY['produtos_selecionados'::text, 'categoria'::text, 'todos'::text]))),
    CONSTRAINT promocoes_tipo_check CHECK ((tipo = ANY (ARRAY['desconto_percentual'::text, 'desconto_fixo'::text, 'segunda_peca'::text, 'compre_ganhe'::text, 'primeira_compra'::text])))
);


--
-- Name: promocoes_produtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promocoes_produtos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    promocao_id uuid NOT NULL,
    produto_id uuid NOT NULL
);


--
-- Name: regras_cashback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regras_cashback (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    percentual numeric(5,2) DEFAULT 0 NOT NULL,
    padrao boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    validade_meses integer
);


--
-- Name: sacola_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sacola_itens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sacola_id uuid NOT NULL,
    versao_id uuid NOT NULL,
    produto_id uuid NOT NULL,
    nome text NOT NULL,
    atributos jsonb DEFAULT '{}'::jsonb NOT NULL,
    preco_unitario numeric(10,2) NOT NULL,
    quantidade integer DEFAULT 1 NOT NULL,
    codigo_barras text
);


--
-- Name: sacolas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sacolas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    criado_por uuid,
    nome_vendedor text,
    cliente_id uuid,
    cliente_nome text,
    status text DEFAULT 'aguardando'::text NOT NULL,
    observacao text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sacolas_status_check CHECK ((status = ANY (ARRAY['aguardando'::text, 'em_atendimento'::text, 'finalizada'::text, 'cancelada'::text])))
);


--
-- Name: tamanhos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tamanhos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: tipos_produto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tipos_produto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: turnos_caixa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos_caixa (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    saldo_inicial numeric(10,2) DEFAULT 0 NOT NULL,
    saldo_final numeric(10,2),
    observacao text,
    status text DEFAULT 'aberto'::text NOT NULL,
    aberto_em timestamp with time zone DEFAULT now() NOT NULL,
    fechado_em timestamp with time zone,
    valor_esperado numeric(10,2),
    divergencia numeric(10,2),
    divergencia_justificativa text,
    autorizacao_id uuid,
    CONSTRAINT turnos_caixa_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'fechado'::text])))
);


--
-- Name: vendas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cliente_id uuid,
    usuario_id uuid NOT NULL,
    promocao_id uuid,
    subtotal numeric(10,2) NOT NULL,
    desconto_promocao numeric(10,2) DEFAULT 0 NOT NULL,
    desconto_pagamento numeric(10,2) DEFAULT 0 NOT NULL,
    cashback_usado numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    cashback_gerado numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'finalizada'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    vendedor_id uuid,
    vendedor_nome text,
    CONSTRAINT vendas_status_check CHECK ((status = ANY (ARRAY['finalizada'::text, 'cancelada'::text, 'pendente_sync'::text])))
);


--
-- Name: versoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.versoes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    produto_id uuid NOT NULL,
    atributos_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    preco_especifico numeric(10,2),
    estoque_atual integer DEFAULT 0 NOT NULL,
    estoque_minimo integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    codigo_barras text,
    arquivado boolean DEFAULT false NOT NULL
);


--
-- Name: _migrations _migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._migrations
    ADD CONSTRAINT _migrations_pkey PRIMARY KEY (name);


--
-- Name: ajustes_estoque ajustes_estoque_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_estoque
    ADD CONSTRAINT ajustes_estoque_pkey PRIMARY KEY (id);


--
-- Name: atributos_produto atributos_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atributos_produto
    ADD CONSTRAINT atributos_produto_pkey PRIMARY KEY (id);


--
-- Name: autorizacoes_log autorizacoes_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autorizacoes_log
    ADD CONSTRAINT autorizacoes_log_pkey PRIMARY KEY (id);


--
-- Name: clientes_contatos clientes_contatos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_contatos
    ADD CONSTRAINT clientes_contatos_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cpf_key UNIQUE (cpf);


--
-- Name: clientes_credito clientes_credito_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_credito
    ADD CONSTRAINT clientes_credito_pkey PRIMARY KEY (cliente_id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: composicoes composicoes_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.composicoes
    ADD CONSTRAINT composicoes_nome_key UNIQUE (nome);


--
-- Name: composicoes composicoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.composicoes
    ADD CONSTRAINT composicoes_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_loja configuracoes_loja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_loja
    ADD CONSTRAINT configuracoes_loja_pkey PRIMARY KEY (id);


--
-- Name: cores cores_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cores
    ADD CONSTRAINT cores_nome_key UNIQUE (nome);


--
-- Name: cores cores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cores
    ADD CONSTRAINT cores_pkey PRIMARY KEY (id);


--
-- Name: formas_pagamento formas_pagamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formas_pagamento
    ADD CONSTRAINT formas_pagamento_pkey PRIMARY KEY (id);


--
-- Name: fornecedores fornecedores_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_cnpj_key UNIQUE (cnpj);


--
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);


--
-- Name: historico_cashback historico_cashback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_cashback
    ADD CONSTRAINT historico_cashback_pkey PRIMARY KEY (id);


--
-- Name: itens_venda itens_venda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_venda
    ADD CONSTRAINT itens_venda_pkey PRIMARY KEY (id);


--
-- Name: lancamentos lancamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos
    ADD CONSTRAINT lancamentos_pkey PRIMARY KEY (id);


--
-- Name: medidas medidas_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medidas
    ADD CONSTRAINT medidas_nome_key UNIQUE (nome);


--
-- Name: medidas medidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medidas
    ADD CONSTRAINT medidas_pkey PRIMARY KEY (id);


--
-- Name: movimentos_caixa movimentos_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_caixa
    ADD CONSTRAINT movimentos_caixa_pkey PRIMARY KEY (id);


--
-- Name: notas_fiscais notas_fiscais_chave_acesso_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_chave_acesso_key UNIQUE (chave_acesso);


--
-- Name: notas_fiscais notas_fiscais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_pkey PRIMARY KEY (id);


--
-- Name: pagamentos_venda pagamentos_venda_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos_venda
    ADD CONSTRAINT pagamentos_venda_pkey PRIMARY KEY (id);


--
-- Name: parcelas_crediario parcelas_crediario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas_crediario
    ADD CONSTRAINT parcelas_crediario_pkey PRIMARY KEY (id);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);


--
-- Name: promocoes promocoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promocoes
    ADD CONSTRAINT promocoes_pkey PRIMARY KEY (id);


--
-- Name: promocoes_produtos promocoes_produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promocoes_produtos
    ADD CONSTRAINT promocoes_produtos_pkey PRIMARY KEY (id);


--
-- Name: promocoes_produtos promocoes_produtos_promocao_id_produto_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promocoes_produtos
    ADD CONSTRAINT promocoes_produtos_promocao_id_produto_id_key UNIQUE (promocao_id, produto_id);


--
-- Name: regras_cashback regras_cashback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regras_cashback
    ADD CONSTRAINT regras_cashback_pkey PRIMARY KEY (id);


--
-- Name: sacola_itens sacola_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sacola_itens
    ADD CONSTRAINT sacola_itens_pkey PRIMARY KEY (id);


--
-- Name: sacolas sacolas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sacolas
    ADD CONSTRAINT sacolas_pkey PRIMARY KEY (id);


--
-- Name: tamanhos tamanhos_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tamanhos
    ADD CONSTRAINT tamanhos_nome_key UNIQUE (nome);


--
-- Name: tamanhos tamanhos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tamanhos
    ADD CONSTRAINT tamanhos_pkey PRIMARY KEY (id);


--
-- Name: tipos_produto tipos_produto_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_produto
    ADD CONSTRAINT tipos_produto_nome_key UNIQUE (nome);


--
-- Name: tipos_produto tipos_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tipos_produto
    ADD CONSTRAINT tipos_produto_pkey PRIMARY KEY (id);


--
-- Name: turnos_caixa turnos_caixa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_caixa
    ADD CONSTRAINT turnos_caixa_pkey PRIMARY KEY (id);


--
-- Name: vendas vendas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_pkey PRIMARY KEY (id);


--
-- Name: versoes versoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versoes
    ADD CONSTRAINT versoes_pkey PRIMARY KEY (id);


--
-- Name: idx_ajustes_versao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ajustes_versao ON public.ajustes_estoque USING btree (versao_id);


--
-- Name: idx_autorizacoes_log_acao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorizacoes_log_acao ON public.autorizacoes_log USING btree (acao);


--
-- Name: idx_autorizacoes_log_criado_em; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autorizacoes_log_criado_em ON public.autorizacoes_log USING btree (criado_em DESC);


--
-- Name: idx_cashback_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashback_cliente ON public.historico_cashback USING btree (cliente_id);


--
-- Name: idx_clientes_contatos_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_contatos_cliente ON public.clientes_contatos USING btree (cliente_id);


--
-- Name: idx_itens_venda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itens_venda ON public.itens_venda USING btree (venda_id);


--
-- Name: idx_lancamentos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lancamentos_data ON public.lancamentos USING btree (data);


--
-- Name: idx_pagamentos_venda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_venda ON public.pagamentos_venda USING btree (venda_id);


--
-- Name: idx_parcelas_crediario_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parcelas_crediario_cliente ON public.parcelas_crediario USING btree (cliente_id);


--
-- Name: idx_parcelas_crediario_status_vc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parcelas_crediario_status_vc ON public.parcelas_crediario USING btree (status, vencimento);


--
-- Name: idx_produtos_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produtos_codigo ON public.produtos USING btree (codigo);


--
-- Name: idx_promocoes_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promocoes_codigo ON public.promocoes USING btree (codigo) WHERE (codigo IS NOT NULL);


--
-- Name: idx_versoes_atributos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versoes_atributos ON public.versoes USING gin (atributos_json);


--
-- Name: idx_versoes_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versoes_codigo_barras ON public.versoes USING btree (codigo_barras);


--
-- Name: idx_versoes_produto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_versoes_produto ON public.versoes USING btree (produto_id);


--
-- Name: sacola_itens_sacola_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sacola_itens_sacola_id_idx ON public.sacola_itens USING btree (sacola_id);


--
-- Name: sacolas_criado_em_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sacolas_criado_em_idx ON public.sacolas USING btree (criado_em DESC);


--
-- Name: sacolas_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sacolas_status_idx ON public.sacolas USING btree (status);


--
-- Name: uniq_produtos_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_produtos_codigo_barras ON public.produtos USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: uniq_versoes_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_versoes_codigo_barras ON public.versoes USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: ajustes_estoque ajustes_estoque_versao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_estoque
    ADD CONSTRAINT ajustes_estoque_versao_id_fkey FOREIGN KEY (versao_id) REFERENCES public.versoes(id);


--
-- Name: atributos_produto atributos_produto_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atributos_produto
    ADD CONSTRAINT atributos_produto_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;


--
-- Name: clientes_contatos clientes_contatos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_contatos
    ADD CONSTRAINT clientes_contatos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: clientes_credito clientes_credito_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes_credito
    ADD CONSTRAINT clientes_credito_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: clientes clientes_regra_cashback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_regra_cashback_id_fkey FOREIGN KEY (regra_cashback_id) REFERENCES public.regras_cashback(id);


--
-- Name: historico_cashback historico_cashback_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_cashback
    ADD CONSTRAINT historico_cashback_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: historico_cashback historico_cashback_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_cashback
    ADD CONSTRAINT historico_cashback_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id);


--
-- Name: itens_venda itens_venda_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_venda
    ADD CONSTRAINT itens_venda_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id) ON DELETE CASCADE;


--
-- Name: itens_venda itens_venda_versao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_venda
    ADD CONSTRAINT itens_venda_versao_id_fkey FOREIGN KEY (versao_id) REFERENCES public.versoes(id);


--
-- Name: lancamentos lancamentos_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lancamentos
    ADD CONSTRAINT lancamentos_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id);


--
-- Name: movimentos_caixa movimentos_caixa_turno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimentos_caixa
    ADD CONSTRAINT movimentos_caixa_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos_caixa(id);


--
-- Name: notas_fiscais notas_fiscais_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notas_fiscais
    ADD CONSTRAINT notas_fiscais_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id);


--
-- Name: pagamentos_venda pagamentos_venda_forma_pagamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos_venda
    ADD CONSTRAINT pagamentos_venda_forma_pagamento_id_fkey FOREIGN KEY (forma_pagamento_id) REFERENCES public.formas_pagamento(id);


--
-- Name: pagamentos_venda pagamentos_venda_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagamentos_venda
    ADD CONSTRAINT pagamentos_venda_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id) ON DELETE CASCADE;


--
-- Name: parcelas_crediario parcelas_crediario_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas_crediario
    ADD CONSTRAINT parcelas_crediario_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: parcelas_crediario parcelas_crediario_pagamento_venda_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parcelas_crediario
    ADD CONSTRAINT parcelas_crediario_pagamento_venda_id_fkey FOREIGN KEY (pagamento_venda_id) REFERENCES public.pagamentos_venda(id) ON DELETE CASCADE;


--
-- Name: produtos produtos_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.tipos_produto(id);


--
-- Name: promocoes_produtos promocoes_produtos_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promocoes_produtos
    ADD CONSTRAINT promocoes_produtos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;


--
-- Name: promocoes_produtos promocoes_produtos_promocao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promocoes_produtos
    ADD CONSTRAINT promocoes_produtos_promocao_id_fkey FOREIGN KEY (promocao_id) REFERENCES public.promocoes(id) ON DELETE CASCADE;


--
-- Name: sacola_itens sacola_itens_sacola_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sacola_itens
    ADD CONSTRAINT sacola_itens_sacola_id_fkey FOREIGN KEY (sacola_id) REFERENCES public.sacolas(id) ON DELETE CASCADE;


--
-- Name: turnos_caixa turnos_caixa_autorizacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_caixa
    ADD CONSTRAINT turnos_caixa_autorizacao_id_fkey FOREIGN KEY (autorizacao_id) REFERENCES public.autorizacoes_log(id);


--
-- Name: vendas vendas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: versoes versoes_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.versoes
    ADD CONSTRAINT versoes_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict pyS4E24N2IfbBfPcul5cZQriSBwtANK9bM32z2oSpi0SnsXD9ALLWSGwU7LgZLm

