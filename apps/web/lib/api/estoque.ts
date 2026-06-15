import { api } from './client'

export interface ResumoEstoque {
  total_skus:    number
  sem_estoque:   number
  alertas:       number
  valor_estoque: string
}

export interface ItemEstoque {
  versao_id:      string
  produto_id:     string
  produto_nome:   string
  atributos_json: Record<string, string>
  estoque_atual:  number
  estoque_minimo: number
  preco_base:     string
  custo_medio:    string
  unidade_medida: string
  sem_estoque:    boolean
  alerta:         boolean
}

export interface AjusteEstoque {
  versao_id:       string
  tipo:            'entrada' | 'saida' | 'ajuste'
  quantidade:      number
  motivo?:         string
  custo_unitario?: number
  cfop?:           string
}

export interface HistoricoAjuste {
  id:             string
  versao_id:      string
  tipo:           string
  quantidade:     number
  motivo:         string | null
  usuario_id:     string
  criado_em:      string
  origem:         string | null
  custo_unitario: string | null
  nota_fiscal_id: string | null
  cfop:           string | null
  nota_numero:    string | null
  nota_emitente:  string | null
}

export interface NFeHeader {
  chave_acesso:  string
  numero:        string
  serie:         string
  data_emissao:  string
  data_entrada:  string
  emitente_cnpj: string
  emitente_nome: string
  emitente_ie:   string | null
  emitente_uf:   string
  vl_produtos:   number
  vl_frete:      number
  vl_seguro:     number
  vl_desconto:   number
  vl_outros:     number
  vl_ipi:        number
  vl_icms:       number
  vl_pis:        number
  vl_cofins:     number
  vl_total:      number
}

export interface NFeItem {
  numero_item:  number
  cprod:        string
  xprod:        string
  ean:          string | null
  ncm:          string | null
  cfop:         string
  ucom:         string
  qcom:         number
  vuncom:       number
  vprod:        number
  icms_cst:     string
  icms_base:    number
  icms_aliq:    number
  icms_valor:   number
  ipi_valor:    number
  pis_aliq:     number
  pis_valor:    number
  cofins_aliq:  number
  cofins_valor: number
  matched:      boolean
  versao: {
    versao_id:      string
    produto_nome:   string
    produto_id:     string
    estoque_atual:  number
    atributos_json: Record<string, string>
  } | null
}

export interface NFePreview {
  header:           NFeHeader
  itens:            NFeItem[]
  nota_id_pendente: string | null
}

export interface NFeItemSalvo {
  id:          string
  nota_id:     string
  numero_item: number
  versao_id:   string | null
  matched:     boolean
  xprod:       string
  qcom:        string
  vuncom:      string
  cfop:        string
}

export interface NotaFiscalEntrada {
  id:            string
  numero:        string
  serie:         string
  data_emissao:  string
  emitente_nome: string
  emitente_cnpj: string
  vl_total:      string
  status:        'pendente' | 'confirmada' | 'cancelada'
  criado_em:     string
  total_itens:   number
  itens_matched: number
}

export const estoqueApi = {
  resumo: () =>
    api.get<ResumoEstoque>('/estoque/resumo').then(r => r.data),

  list: (params?: { alerta?: boolean; semEstoque?: boolean }) =>
    api.get<ItemEstoque[]>('/estoque', {
      params: {
        ...(params?.alerta     ? { alerta:      'true' } : {}),
        ...(params?.semEstoque ? { sem_estoque: 'true' } : {}),
      },
    }).then(r => r.data),

  ajustar: (data: AjusteEstoque) =>
    api.post<{ versao_id: string; estoque_atual: number; custo_medio: number }>(
      '/estoque/ajuste', data
    ).then(r => r.data),

  historico: (versao_id: string) =>
    api.get<HistoricoAjuste[]>(`/estoque/ajustes/${versao_id}`).then(r => r.data),

  historicoAjustes: (versao_id: string) =>
    api.get<HistoricoAjuste[]>(`/estoque/ajustes/${versao_id}`).then(r => r.data),

  nfe: {
    preview: (xml: string) =>
      api.post<NFePreview>('/estoque/nfe/preview', { xml }).then(r => r.data),

    salvar: (data: { xml: string; header: NFeHeader; itens: NFeItem[] }) =>
      api.post<{ nota_id: string }>('/estoque/nfe/salvar', data).then(r => r.data),

    itens: (nota_id: string) =>
      api.get<NFeItemSalvo[]>(`/estoque/notas/${nota_id}/itens`).then(r => r.data),

    confirmar: (data: {
      nota_id: string
      itens: Array<{ id: string; versao_id: string | null; confirmar: boolean }>
    }) =>
      api.post<{ ok: boolean }>('/estoque/nfe/confirmar', data).then(r => r.data),

    listar: () =>
      api.get<NotaFiscalEntrada[]>('/estoque/notas').then(r => r.data),
  },
}
