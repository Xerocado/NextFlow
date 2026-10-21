# Migrações

`V1__usuarios_e_recuperacao_senha.sql` cria usuários e tokens de recuperação.
`V2__estabelecimentos_e_vinculos.sql` cria estabelecimentos e vinculos de proprietario.
`V3__codigo_recuperacao_seis_digitos.sql` atualiza a recuperacao de senha.
`V4__dados_empresa.sql` adiciona os dados complementares da empresa.
`V5__gastos_variaveis.sql` cria gastos pagos do dia, sem recorrencia.
`V6__clientes.sql` cria clientes por estabelecimento.
Os proximos scripts devem comecar em `V7__descricao.sql`, apos definicao das regras.
Este README não é executado pelo Flyway. Não altere scripts já aplicados.
