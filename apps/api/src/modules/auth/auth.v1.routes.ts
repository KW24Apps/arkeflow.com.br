import type { FastifyInstance } from 'fastify'
import { loginV1Handler, meV1Handler, logoutV1Handler } from './auth.v1.controller'

// API produto-a-hub (Connect e futuros produtos). Externamente:
// POST https://app.arkeflow.com.br/api/v1/auth/login
// GET  https://app.arkeflow.com.br/api/v1/auth/me
// POST https://app.arkeflow.com.br/api/v1/auth/logout
export async function authV1Routes(app: FastifyInstance) {
  app.post('/login', loginV1Handler)
  app.get('/me', meV1Handler)
  app.post('/logout', logoutV1Handler)
}
