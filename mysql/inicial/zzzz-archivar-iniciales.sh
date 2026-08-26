#!/bin/sh
set -eu

# MySQL ejecuta este archivo al final de la primera inicializacion del volumen.
# Los SQL se mueven para que dejen de ser entradas pendientes, pero se conserva
# una copia recuperable en vez de borrarlos definitivamente.
mkdir -p /docker-entrypoint-initdb.d/aplicados
for sql_file in /docker-entrypoint-initdb.d/*.sql; do
  [ -f "${sql_file}" ] || continue
  mv "${sql_file}" /docker-entrypoint-initdb.d/aplicados/
done
