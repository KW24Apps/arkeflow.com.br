-- Move crediário config from configuracoes_loja into formas_pagamento.config for the crediário form.
-- Does NOT drop the crediario_* columns from configuracoes_loja (kept as backup; drop in a later cleanup).
UPDATE formas_pagamento fp
SET config = jsonb_build_object(
  'max_parcelas',        cl.crediario_max_parcelas,
  'entrada_obrigatoria', cl.crediario_entrada_obrigatoria,
  'entrada_min_pct',     cl.crediario_entrada_min_pct,
  'juros_habilitado',    cl.crediario_juros_habilitado,
  'juros_sem_ate',       cl.crediario_juros_sem_ate,
  'juros_mes',           cl.crediario_juros_mes,
  'atraso_habilitado',   cl.crediario_atraso_habilitado,
  'atraso_multa',        cl.crediario_atraso_multa,
  'atraso_mora_mes',     cl.crediario_atraso_mora_mes,
  'formas_entrada',      cl.crediario_formas_entrada,
  'formas_parcela',      cl.crediario_formas_parcela
)
FROM (SELECT * FROM configuracoes_loja LIMIT 1) cl
WHERE fp.tipo = 'crediario';
