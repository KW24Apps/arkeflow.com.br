import type { FastifyReply, FastifyRequest } from 'fastify'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'
import { createProdutoSchema, updateProdutoSchema, createVersaoSchema, updateVersaoSchema } from './produtos.schema'
import * as svc from './produtos.service'

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { q } = request.query as { q?: string }
  return reply.send(await svc.listProdutos(pool, q))
}

export async function getHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { id } = request.params as { id: string }
  return reply.send(await svc.getProduto(pool, id))
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const data = createProdutoSchema.parse(request.body)
  return reply.status(201).send(await svc.createProduto(pool, data))
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { id } = request.params as { id: string }
  const data = updateProdutoSchema.parse(request.body)
  return reply.send(await svc.updateProduto(pool, id, data))
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { id } = request.params as { id: string }
  await svc.deleteProduto(pool, id)
  return reply.status(204).send()
}

// Atributos
export async function addAtributoHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { id } = request.params as { id: string }
  const { nome } = request.body as { nome: string }
  return reply.status(201).send(await svc.addAtributo(pool, id, nome))
}

export async function removeAtributoHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { atributo_id } = request.params as { atributo_id: string }
  await svc.removeAtributo(pool, atributo_id)
  return reply.status(204).send()
}

// Versões
export async function createVersaoHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { id } = request.params as { id: string }
  const data = createVersaoSchema.parse(request.body)
  return reply.status(201).send(await svc.createVersao(pool, id, data))
}

export async function updateVersaoHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { versao_id } = request.params as { versao_id: string }
  const data = updateVersaoSchema.parse(request.body)
  return reply.send(await svc.updateVersao(pool, versao_id, data))
}

export async function deleteVersaoHandler(request: FastifyRequest, reply: FastifyReply) {
  const pool = getTenantPoolFromRequest(request)
  const { versao_id } = request.params as { versao_id: string }
  await svc.deleteVersao(pool, versao_id)
  return reply.status(204).send()
}
