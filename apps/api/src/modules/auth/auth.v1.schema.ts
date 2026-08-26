import { z } from 'zod'

// API pública produto-a-hub (Connect e futuros produtos). Sem `forcar` -- essa camada não expõe
// a opção de derrubar sessão de outro dispositivo, mantém o comportamento mais simples/seguro.
export const loginV1Schema = z.object({
  email:        z.string().min(1, 'Email obrigatório'),
  senha:        z.string().min(1, 'Senha obrigatória'),
  produto_slug: z.string().min(1, 'produto_slug obrigatório'),
})

export type LoginV1Input = z.infer<typeof loginV1Schema>
