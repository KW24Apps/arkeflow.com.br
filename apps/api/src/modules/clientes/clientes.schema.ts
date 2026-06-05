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
})

export type CreateClienteInput = z.infer<typeof createClienteSchema>
