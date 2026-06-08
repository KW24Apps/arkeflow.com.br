import { z } from 'zod'

export const createClienteSchema = z.object({
  nome:     z.string().min(1),
  telefone: z.string().optional(),
  cpf:      z.string().optional(),
  email:    z.string().email().optional().or(z.literal('')),
})

export const updateClienteSchema = createClienteSchema.partial().extend({
  regra_cashback_id: z.string().uuid().nullable().optional(),
  medidas_json:      z.record(z.string()).optional(),
  // Address fields
  cep:          z.string().optional().nullable(),
  logradouro:   z.string().optional().nullable(),
  numero:       z.string().optional().nullable(),
  complemento:  z.string().optional().nullable(),
  bairro:       z.string().optional().nullable(),
  cidade:       z.string().optional().nullable(),
  estado:       z.string().max(2).optional().nullable(),
  credito_liberado: z.boolean().optional(),
  limite_credito:   z.number().nonnegative().optional(),
})

export type CreateClienteInput = z.infer<typeof createClienteSchema>
