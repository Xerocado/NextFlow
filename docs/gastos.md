# Gastos variaveis do dia

Cada gasto representa uma saida efetiva de caixa de uma empresa, sem recorrencia.
Descricao, valor e data sao obrigatorios; categoria e observacao sao opcionais.
Valores em BRL: positivos, ate 12 digitos inteiros e 2 casas decimais, sem
arredondamento automatico. Data representa o dia local informado pelo usuario;
a interface inicia no dia atual de America/Sao_Paulo. Criacao registrada em UTC.
Contas a pagar, pagamentos parciais de despesas, edicao e exclusao ficam para
outro incremento. Atendimentos avulsos e seus recebimentos ainda nao foram implementados.

## Contrato

- POST `/api/estabelecimentos/{empresaId}/gastos`: sessao, CSRF e proprietario.
  Corpo: `descricao` (ate 120), `valor` (decimal em reais), `data` (YYYY-MM-DD),
  `categoria` (ate 60), `observacao` (ate 500). Retorna 201 com o gasto e seu UUID.
- GET `/api/estabelecimentos/{empresaId}/gastos?data=2026-10-17&pagina=0&tamanho=20`:
  exige sessao e vinculo com a empresa. Data obrigatoria; tamanho entre 1 e 100.
  Retorna `itens`, `pagina`, `tamanho`, `total` e `totalGasto` de todo o dia,
  independentemente da pagina. Ordenacao: criacao decrescente e UUID decrescente.
- Dados invalidos: 400; sem sessao: 401; CSRF invalido: 403;
  empresa inexistente ou alheia: mesmo 404. O usuario vem da sessao.

A V5 cria somente a tabela gastos e seu indice, sem alterar registros existentes.
Sera aplicada pelo Flyway ao reiniciar a API; nao recrie o banco ou volume.
Na interface, selecione uma empresa em Minha empresa e abra Gastos do dia.
Em falha de cadastro, atualize e confira a lista antes de repetir: uma resposta
perdida nao garante que a gravacao falhou. Nao ha repeticao automatica de POST.
O total real dos gastos fica nesta tela. Visao geral e relatorios mostram Em desenvolvimento, sem indicadores ficticios. O saldo real ainda depende de atendimentos e recebimentos.

