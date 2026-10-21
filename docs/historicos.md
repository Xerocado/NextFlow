# Historico de atendimentos: estado e regras aprovadas

Atualizacao de 21/10/2026: API de entregas e pagamentos implementada na primeira
etapa, incluindo consulta por periodo e pendencias. Veja [entregas](entregas.md).
A interface de Historico/Pendencias foi integrada pelo outro agente e preservada;
Movimento do dia foi adicionado na etapa coordenada. O texto abaixo registra o
estado anterior a estas implementacoes.

A demonstracao foi retirada da interface em 17/10/2026. A rota `#/historico`
agora mostra Em desenvolvimento. Nao ha cadastro ou historico real de atendimentos,
recebimentos individuais, fiado ou cobrancas implementados no backend.

## Regras aprovadas para a implementacao futura

- Atendimento pode ter cliente cadastrado ou ser avulso, sem exigir cadastro.
- Avulso pode ter nome/identificacao opcional.
- Ambos podem ser pagos integralmente, parcialmente, ficar pendentes/fiado
  ou ser sem cobranca.
- Sem cobranca nao gera divida; motivo e opcional.
- Atendimento e recebimentos precisam pertencer a empresa, com autorizacao
  do usuario autenticado em todas as operacoes.

Estas regras foram aprovadas no dialogo, mas nao sao funcionalidades entregues.
Antes de implementar, detalhar pagamentos, datas efetivas, correcoes e limites.
Os gastos variaveis ja possuem implementacao separada: veja [gastos](gastos.md).

## Referencia antiga

`frontend/src/Historico.tsx`, `frontend/src/demo/dados.ts` e
`frontend/src/demo/filtrosHistorico.ts` permanecem sem conexao com o Workspace.
Os testes desses exemplos sao historicos e nao validam o dominio real.
Nao reativar os dados ficticios ao implementar os endpoints.
