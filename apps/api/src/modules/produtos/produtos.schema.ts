import { z } from 'zod'

export const createProdutoSchema = z.object({
  nome:             z.string().min(1),
  tipo_id:          z.string().uuid().optional().nullable(),
  categoria:        z.string().optional(),
  marca:            z.string().optional(),
  descricao:        z.string().optional(),
  composicao:       z.string().optional(),  // legado — mantido por compatibilidade
  composicao_itens: z.array(z.object({
    material:   z.string().min(1),
    percentual: z.coerce.number().int().min(1).max(100),
  })).optional(),
  preco_base:       z.coerce.number().positive('Preço deve ser positivo'),
  controle_estoque: z.boolean().default(true),
  atributos:        z.array(z.string().min(1)).optional(),
})

export const updateProdutoSchema = createProdutoSchema.partial()

export const createVersaoSchema = z.object({
  atributos_json:    z.record(z.string()),
  preco_especifico:  z.coerce.number().positive().optional().nullable(),
  estoque_atual:     z.coerce.number().int().min(0).default(0),
  estoque_minimo:    z.coerce.number().int().min(0).default(0),
})

export const updateVersaoSchema = createVersaoSchema.partial()

export type CreateProdutoInput = z.infer<typeof createProdutoSchema>
export type UpdateProdutoInput = z.infer<typeof updateProdutoSchema>
export type CreateVersaoInput  = z.infer<typeof createVersaoSchema>
