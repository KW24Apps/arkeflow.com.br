export type NivelUsuario =
  | 'admin_plataforma'
  | 'parceiro'
  | 'dono_loja'
  | 'vendedor'

// Payload gravado no JWT após login
export interface JwtPayload {
  id: string
  email: string
  nivel: NivelUsuario
  loja_id: string | null   // null para admin_plataforma
  banco_id: string | null  // nome do banco PostgreSQL da loja
  permissoes: string[]     // slugs de menu liberados; dono_loja sempre tem ['*']
}
