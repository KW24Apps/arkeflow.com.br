import { z } from 'zod'

export const loginSchema = z.object({
  email:  z.string().min(1, 'Email ou usuário obrigatório'),  // aceita email OU username
  senha:  z.string().min(1, 'Senha obrigatória'),
  forcar: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
