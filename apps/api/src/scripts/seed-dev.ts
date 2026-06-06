import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { platformPool, getTenantPool } from '../config/database'

const TENANT_DB   = 'loja_teste'
const LOJA_EMAIL  = 'loja@teste.arkeflow.com.br'

// ── Names / data pools ────────────────────────────────────────────────────────

const NOMES_FEMININOS = [
  'Ana Silva', 'Beatriz Santos', 'Carla Oliveira', 'Daniela Costa', 'Eduarda Lima',
  'Fernanda Alves', 'Gabriela Ferreira', 'Helena Rodrigues', 'Isabela Martins', 'Júlia Pereira',
  'Larissa Sousa', 'Mariana Castro', 'Natalia Ribeiro', 'Patrícia Carvalho', 'Rafaela Gomes',
  'Sabrina Nunes', 'Tatiana Barbosa', 'Vanessa Monteiro', 'Yasmin Teixeira', 'Camila Pinto',
]

const NOMES_MASCULINOS = [
  'André Souza', 'Bruno Lima', 'Carlos Mendes', 'Diego Ferreira', 'Eduardo Rocha',
  'Felipe Santos', 'Gustavo Oliveira', 'Henrique Alves', 'Igor Martins', 'João Pedro Costa',
  'Leonardo Ribeiro', 'Marcos Carvalho', 'Nicolas Gomes', 'Pedro Henrique Nunes', 'Rafael Barbosa',
  'Samuel Monteiro', 'Thiago Teixeira', 'Vinicius Pinto', 'Wellington Castro', 'Rodrigo Dias',
]

const TIPOS_PRODUTO = ['Camiseta', 'Calça', 'Bermuda', 'Blusa', 'Vestido']
const GENEROS       = ['Masculino', 'Feminino', 'Unissex', 'Infantil']

function slug(nome: string) {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '.')
}

function fakeCpf(i: number) {
  const n = String(i + 1).padStart(9, '0')
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-0${(i % 9) + 1}`
}

function fakePhone(i: number) {
  const mid = String(90000 + ((i * 31337) % 9999)).padStart(5, '9')
  const end  = String(1000 + ((i * 7919)  % 8999)).padStart(4, '0')
  return `(51) ${mid}-${end}`
}

function precoAleatorio(base: number, spread: number) {
  return (base + Math.floor(Math.random() * spread) * 10 + 0.9).toFixed(2)
}

// ── Main ──────────────────────────────────────────────────────────────────────

;(async () => {
  const tenant = getTenantPool(TENANT_DB)

  // ── Find loja_id in platform DB ───────────────────────────────────────────
  const lojaRes = await platformPool.query(
    `SELECT id FROM lojas WHERE banco_id = $1 LIMIT 1`,
    [TENANT_DB]
  )
  if (!lojaRes.rows.length) {
    console.error(`Loja com banco_id '${TENANT_DB}' não encontrada na platform DB.`)
    process.exit(1)
  }
  const lojaId = lojaRes.rows[0].id
  console.log(`\n✓ Loja encontrada: ${lojaId}`)

  // ── 1. Clientes ────────────────────────────────────────────────────────────
  const regrasRes = await tenant.query(`SELECT id FROM regras_cashback WHERE ativo = true LIMIT 5`)
  const regras    = regrasRes.rows.map((r: any) => r.id)

  const todosNomes = [...NOMES_FEMININOS, ...NOMES_MASCULINOS]
  let clientesCount = 0

  for (let i = 0; i < 40; i++) {
    const nome    = todosNomes[i % todosNomes.length]
    const cpf     = fakeCpf(i)
    const phone   = fakePhone(i)
    const email   = `${slug(nome)}.${i + 1}@email.com.br`
    const cashbackId = regras.length > 0 ? regras[i % regras.length] : null

    await tenant.query(
      `INSERT INTO clientes (nome, cpf, telefone, email, regra_cashback_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cpf) DO NOTHING`,
      [nome, cpf, phone, email, cashbackId]
    )
    clientesCount++
  }
  console.log(`✓ ${clientesCount} clientes criados`)

  // ── 2. Colaboradores (platform DB) ────────────────────────────────────────
  const colaboradores = [
    { nome: 'Ana Lima',       username: 'c1' },
    { nome: 'Bruno Souza',    username: 'c2' },
    { nome: 'Carlos Mendes',  username: 'c3' },
    { nome: 'Daniela Costa',  username: 'c4' },
    { nome: 'Eduardo Silva',  username: 'c5' },
  ]
  const senhaHash = await bcrypt.hash('123456', 10)
  let colaborCount = 0

  for (const c of colaboradores) {
    const em = `${c.username}@loja-teste.arkeflow.com.br`
    await platformPool.query(
      `INSERT INTO usuarios (loja_id, nome, email, senha_hash, nivel, ativo, permissoes, username)
       VALUES ($1, $2, $3, $4, 'vendedor', true, '["caixa","clientes","produtos","estoque"]', $5)
       ON CONFLICT (email) DO NOTHING`,
      [lojaId, c.nome, em, senhaHash, c.username]
    )
    colaborCount++
  }
  console.log(`✓ ${colaborCount} colaboradores criados`)

  // ── 3. Produtos + Variações ───────────────────────────────────────────────
  const tamRes  = await tenant.query(`SELECT id, nome FROM tamanhos WHERE ativo = true ORDER BY ordem LIMIT 8`)
  const corRes  = await tenant.query(`SELECT id, nome FROM cores WHERE ativo = true LIMIT 10`)
  const tipoRes = await tenant.query(`SELECT id, nome FROM tipos_produto WHERE nome = ANY($1)`, [TIPOS_PRODUTO])

  const tamanhos: { id: string; nome: string }[] = tamRes.rows
  const cores:    { id: string; nome: string }[] = corRes.rows
  const tipoMap   = new Map<string, string>(tipoRes.rows.map((r: any) => [r.nome, r.id]))

  // 4 tamanho+cor combos per variation call — pick deterministically
  const COMBOS: Array<[string, string, string, string]> = []
  for (let t = 0; t < Math.min(4, tamanhos.length); t++) {
    for (let c = 0; c < Math.min(3, cores.length); c++) {
      COMBOS.push([tamanhos[t].id, tamanhos[t].nome, cores[c].id, cores[c].nome])
    }
  }

  const PRECOS: Record<string, [number, number]> = {
    Camiseta: [49, 15],
    Calça:    [99, 20],
    Bermuda:  [59, 15],
    Blusa:    [79, 20],
    Vestido:  [129, 17],
  }

  let prodCount = 0; let varCount = 0

  for (const tipNome of TIPOS_PRODUTO) {
    const tipoId = tipoMap.get(tipNome)
    const [base, spread] = PRECOS[tipNome]

    for (let pi = 0; pi < 10; pi++) {
      const genero = GENEROS[pi % GENEROS.length]
      const marca  = ['Hering', 'Renner', 'Marisa', 'C&A', 'Riachuelo'][pi % 5]
      const nome   = `${tipNome} ${marca} ${genero.charAt(0)}${pi + 1}`
      const preco  = precoAleatorio(base, spread)

      const pRes = await tenant.query(
        `INSERT INTO produtos (nome, tipo_id, marca, preco_base, controle_estoque, ativo)
         VALUES ($1, $2, $3, $4, true, true) RETURNING id`,
        [nome, tipoId ?? null, marca, preco]
      )
      const prodId = pRes.rows[0].id
      prodCount++

      // 2–4 variations
      const numVar = 2 + (pi % 3)
      for (let vi = 0; vi < numVar; vi++) {
        const [tamId, tamNome, corId, corNome] = COMBOS[(pi * 3 + vi) % COMBOS.length]
        const estoque = 10 + Math.floor(Math.random() * 91)
        await tenant.query(
          `INSERT INTO versoes (produto_id, atributos_json, estoque_atual, estoque_minimo)
           VALUES ($1, $2, $3, 5)
           ON CONFLICT DO NOTHING`,
          [prodId, JSON.stringify({ Tamanho: tamNome, Cor: corNome }), estoque]
        )
        varCount++
      }
    }
  }
  console.log(`✓ ${prodCount} produtos criados, ${varCount} variações`)

  console.log('\n✅ Seed concluído.\n')
  await tenant.end()
  await platformPool.end()
})().catch(err => { console.error('\n❌ Erro:', err.message ?? err); process.exit(1) })
