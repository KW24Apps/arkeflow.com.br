import { z } from 'zod'

export const loginSchema = z.object({
  email:      z.string().min(1, 'Email ou usuário obrigatório'),
  senha:      z.string().min(1, 'Senha obrigatória'),
  forcar:     z.boolean().optional(),
  plataforma: z.enum(['web', 'mobile', 'desktop']).optional().default('web'),
})

export type LoginInput = z.infer<typeof loginSchema>
