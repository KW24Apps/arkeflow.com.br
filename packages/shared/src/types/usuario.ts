export type NivelUsuario =
  | 'admin_plataforma'
  | 'parceiro'
  | 'dono_loja'
  | 'vendedor'

// Payload gravado no JWT após login
export interface JwtPayload {
  id: string
  nome: string             // nome do usuário para exibição
  email: string
  username?: string | null
  nivel: NivelUsuario
  cliente_id: string | null // null para admin_plataforma
  banco_id: string | null  // nome do banco PostgreSQL da loja
  permissoes: string[]     // slugs de menu liberados; dono_loja sempre tem ['*']
  sid?: string             // session id; ausente em tokens pré-v2 (retrocompatibilidade)
  plataforma?: 'web' | 'mobile' | 'desktop'
}
