-- Fix rows where categorias_alvo was stored as {} (empty object) instead of [] (empty array)
UPDATE promocoes SET categorias_alvo = '[]'::jsonb
WHERE categorias_alvo = '{}'::jsonb;

-- Fix any double-encoded rows (string containing JSON) produced by erroneous JSON.stringify
UPDATE promocoes
SET categorias_alvo = (categorias_alvo::text)::jsonb
WHERE jsonb_typeof(categorias_alvo) = 'string';
