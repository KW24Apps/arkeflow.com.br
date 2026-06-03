const TOKEN_KEY = 'arkeflow_token'

export const session = {
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
