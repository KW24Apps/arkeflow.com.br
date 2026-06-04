import { z } from 'zod'

export const createClienteSchema = z.object({
  nome:     z.string().min(1),
  telefone: z.string().optional(),
  cpf:      z.string().optional(),
  email:    z.string().email().optional().or(z.literal('')),
})

export const updateClienteSchema = createClienteSchema.partial()

export type CreateClienteInput = z.infer<typeof createClienteSchema>
