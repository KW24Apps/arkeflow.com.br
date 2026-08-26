import { z } from 'zod'

// API pública produto-a-hub (Connect e futuros produtos).
export const loginV1Schema = z.object({
  email:        z.string().min(1, 'Email obrigatório'),
  senha:        z.string().min(1, 'Senha obrigatória'),
  produto_slug: z.string().min(1, 'produto_slug obrigatório'),
  // Opcional -- permite ao produto oferecer "continuar mesmo assim / desconectar o outro
  // dispositivo" depois de um 409 SESSAO_ATIVA, igual ao login clássico já faz.
  forcar:       z.boolean().optional(),
})

export type LoginV1Input = z.infer<typeof loginV1Schema>
