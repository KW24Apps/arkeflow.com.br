UPDATE promocoes
SET    aplicacao    = 'todos',
       aplica_todos = true
WHERE  tipo = 'primeira_compra'
  AND  (aplicacao != 'todos' OR aplica_todos = false);
