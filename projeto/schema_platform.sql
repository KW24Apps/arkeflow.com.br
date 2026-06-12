--
-- PostgreSQL database dump
--

\restrict doF0cLmbn6zJ3ETlI8FcmUFM4GE3XKEkXaQYVBqPWaeBoO2kUPxxmressLaeQxW

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
-- Name: assinaturas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assinaturas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loja_id uuid NOT NULL,
    plano_id uuid NOT NULL,
    inicio date NOT NULL,
    vencimento date NOT NULL,
    status text DEFAULT 'ativa'::text NOT NULL,
    CONSTRAINT assinaturas_status_check CHECK ((status = ANY (ARRAY['ativa'::text, 'trial'::text, 'suspensa'::text, 'cancelada'::text])))
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
    medidas_json jsonb DEFAULT '{}'::jsonb
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
-- Name: colaboradores_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colaboradores_documentos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    nome text NOT NULL,
    arquivo text NOT NULL,
    tipo_mime text,
    tamanho integer,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: colaboradores_perfil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colaboradores_perfil (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    cpf text,
    rg text,
    data_nascimento date,
    telefone text,
    cargo text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado character(2),
    banco text,
    agencia text,
    conta text,
    conta_digito text,
    tipo_conta text,
    pix text,
    data_admissao date,
    salario numeric(10,2),
    tipo_contrato text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT colaboradores_perfil_tipo_conta_check CHECK ((tipo_conta = ANY (ARRAY['corrente'::text, 'poupanca'::text]))),
    CONSTRAINT colaboradores_perfil_tipo_contrato_check CHECK ((tipo_contrato = ANY (ARRAY['clt'::text, 'pj'::text, 'mei'::text, 'autonomo'::text, 'estagio'::text, 'outro'::text])))
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
    link_loja text
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
    desconto_percentual numeric(5,2) DEFAULT 0 NOT NULL,
    desconto_maximo numeric(10,2) DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL
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
    desconto_item numeric(10,2) DEFAULT 0 NOT NULL
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
-- Name: logs_acesso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_acesso (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid NOT NULL,
    loja_id uuid,
    ip text,
    tipo text NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT logs_acesso_tipo_check CHECK ((tipo = ANY (ARRAY['login'::text, 'logout'::text])))
);


--
-- Name: lojas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lojas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    cnpj text,
    telefone text,
    email text,
    banco_id text NOT NULL,
    status text DEFAULT 'ativo'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    link_loja text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado character(2),
    regime_tributario character varying(30),
    certificado_digital_path text,
    certificado_digital_senha text,
    CONSTRAINT lojas_status_check CHECK ((status = ANY (ARRAY['ativo'::text, 'inativo'::text, 'suspenso'::text])))
);


--
-- Name: lojas_contatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lojas_contatos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loja_id uuid NOT NULL,
    tipo text NOT NULL,
    nome text NOT NULL,
    telefone text,
    email text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lojas_contatos_tipo_check CHECK ((tipo = ANY (ARRAY['comercial'::text, 'financeiro'::text, 'socio'::text])))
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
-- Name: modelos_permissao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_permissao (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loja_id uuid NOT NULL,
    nome text NOT NULL,
    permissoes jsonb DEFAULT '[]'::jsonb NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    sistema boolean DEFAULT false NOT NULL
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
-- Name: pacotes_nota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pacotes_nota (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loja_id uuid NOT NULL,
    quantidade integer NOT NULL,
    utilizadas integer DEFAULT 0 NOT NULL,
    valor_pago numeric(10,2) NOT NULL,
    validade date NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
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
    detalhe text
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
    CONSTRAINT parcelas_crediario_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text, 'vencido'::text])))
);


--
-- Name: planos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    preco_mensal numeric(10,2) NOT NULL,
    max_usuarios integer DEFAULT 5 NOT NULL,
    franquia_notas integer DEFAULT 0 NOT NULL,
    tem_financeiro boolean DEFAULT false NOT NULL,
    tem_cashback boolean DEFAULT false NOT NULL,
    tem_promocoes boolean DEFAULT false NOT NULL,
    ativo boolean DEFAULT true NOT NULL
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
    codigo text
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
    CONSTRAINT turnos_caixa_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'fechado'::text])))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loja_id uuid,
    nome text NOT NULL,
    email text NOT NULL,
    senha_hash text NOT NULL,
    nivel text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    ultimo_acesso timestamp with time zone,
    permissoes jsonb DEFAULT '[]'::jsonb NOT NULL,
    dias_semana jsonb,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    modelo_permissao_id uuid,
    username text,
    is_supervisor boolean DEFAULT false NOT NULL,
    sessao_atual uuid,
    sessao_ip text,
    sessao_em timestamp with time zone,
    sessao_plataforma text,
    CONSTRAINT usuarios_nivel_check CHECK ((nivel = ANY (ARRAY['admin_plataforma'::text, 'parceiro'::text, 'dono_loja'::text, 'vendedor'::text]))),
    CONSTRAINT usuarios_sessao_plataforma_check CHECK ((sessao_plataforma = ANY (ARRAY['web'::text, 'mobile'::text, 'desktop'::text])))
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
    codigo_barras text
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
-- Name: assinaturas assinaturas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_pkey PRIMARY KEY (id);


--
-- Name: atributos_produto atributos_produto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atributos_produto
    ADD CONSTRAINT atributos_produto_pkey PRIMARY KEY (id);


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
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: colaboradores_documentos colaboradores_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colaboradores_documentos
    ADD CONSTRAINT colaboradores_documentos_pkey PRIMARY KEY (id);


--
-- Name: colaboradores_perfil colaboradores_perfil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colaboradores_perfil
    ADD CONSTRAINT colaboradores_perfil_pkey PRIMARY KEY (id);


--
-- Name: colaboradores_perfil colaboradores_perfil_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colaboradores_perfil
    ADD CONSTRAINT colaboradores_perfil_usuario_id_key UNIQUE (usuario_id);


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
-- Name: logs_acesso logs_acesso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_acesso
    ADD CONSTRAINT logs_acesso_pkey PRIMARY KEY (id);


--
-- Name: lojas lojas_banco_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lojas
    ADD CONSTRAINT lojas_banco_id_key UNIQUE (banco_id);


--
-- Name: lojas lojas_cnpj_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lojas
    ADD CONSTRAINT lojas_cnpj_key UNIQUE (cnpj);


--
-- Name: lojas_contatos lojas_contatos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lojas_contatos
    ADD CONSTRAINT lojas_contatos_pkey PRIMARY KEY (id);


--
-- Name: lojas lojas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lojas
    ADD CONSTRAINT lojas_pkey PRIMARY KEY (id);


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
-- Name: modelos_permissao modelos_permissao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_permissao
    ADD CONSTRAINT modelos_permissao_pkey PRIMARY KEY (id);


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
-- Name: pacotes_nota pacotes_nota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_nota
    ADD CONSTRAINT pacotes_nota_pkey PRIMARY KEY (id);


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
-- Name: planos planos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_pkey PRIMARY KEY (id);


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
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_username_key UNIQUE (username);


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
-- Name: idx_cashback_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cashback_cliente ON public.historico_cashback USING btree (cliente_id);


--
-- Name: idx_clientes_contatos_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_contatos_cliente ON public.clientes_contatos USING btree (cliente_id);


--
-- Name: idx_docs_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_docs_usuario ON public.colaboradores_documentos USING btree (usuario_id);


--
-- Name: idx_itens_venda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_itens_venda ON public.itens_venda USING btree (venda_id);


--
-- Name: idx_lancamentos_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lancamentos_data ON public.lancamentos USING btree (data);


--
-- Name: idx_logs_acesso_loja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_acesso_loja ON public.logs_acesso USING btree (loja_id, criado_em DESC);


--
-- Name: idx_logs_acesso_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_logs_acesso_usuario ON public.logs_acesso USING btree (usuario_id, criado_em DESC);


--
-- Name: idx_lojas_contatos_loja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lojas_contatos_loja ON public.lojas_contatos USING btree (loja_id);


--
-- Name: idx_modelos_permissao_loja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_modelos_permissao_loja ON public.modelos_permissao USING btree (loja_id);


--
-- Name: idx_pagamentos_venda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagamentos_venda ON public.pagamentos_venda USING btree (venda_id);


--
-- Name: idx_produtos_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produtos_codigo ON public.produtos USING btree (codigo);


--
-- Name: idx_promocoes_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_promocoes_codigo ON public.promocoes USING btree (codigo) WHERE (codigo IS NOT NULL);


--
-- Name: idx_usuarios_loja; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_loja ON public.usuarios USING btree (loja_id);


--
-- Name: idx_usuarios_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_username ON public.usuarios USING btree (username);


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
-- Name: ajustes_estoque ajustes_estoque_versao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ajustes_estoque
    ADD CONSTRAINT ajustes_estoque_versao_id_fkey FOREIGN KEY (versao_id) REFERENCES public.versoes(id);


--
-- Name: assinaturas assinaturas_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id);


--
-- Name: assinaturas assinaturas_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assinaturas
    ADD CONSTRAINT assinaturas_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id);


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
-- Name: clientes clientes_regra_cashback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_regra_cashback_id_fkey FOREIGN KEY (regra_cashback_id) REFERENCES public.regras_cashback(id);


--
-- Name: colaboradores_documentos colaboradores_documentos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colaboradores_documentos
    ADD CONSTRAINT colaboradores_documentos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: colaboradores_perfil colaboradores_perfil_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colaboradores_perfil
    ADD CONSTRAINT colaboradores_perfil_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


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
-- Name: logs_acesso logs_acesso_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_acesso
    ADD CONSTRAINT logs_acesso_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id);


--
-- Name: logs_acesso logs_acesso_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_acesso
    ADD CONSTRAINT logs_acesso_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: lojas_contatos lojas_contatos_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lojas_contatos
    ADD CONSTRAINT lojas_contatos_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id) ON DELETE CASCADE;


--
-- Name: modelos_permissao modelos_permissao_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_permissao
    ADD CONSTRAINT modelos_permissao_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id) ON DELETE CASCADE;


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
-- Name: pacotes_nota pacotes_nota_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pacotes_nota
    ADD CONSTRAINT pacotes_nota_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id);


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
-- Name: usuarios usuarios_loja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_loja_id_fkey FOREIGN KEY (loja_id) REFERENCES public.lojas(id);


--
-- Name: usuarios usuarios_modelo_permissao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_modelo_permissao_id_fkey FOREIGN KEY (modelo_permissao_id) REFERENCES public.modelos_permissao(id);


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

\unrestrict doF0cLmbn6zJ3ETlI8FcmUFM4GE3XKEkXaQYVBqPWaeBoO2kUPxxmressLaeQxW

