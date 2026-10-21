# Estado atual e continuidade — 19/10/2026

## Padronizacao do nome — 21/10/2026

Nome do produto: NextFlow; identificador tecnico do banco em novas instalacoes:
`nextflow`. Atualizados application.properties, .env.example e documentacao.
O `.env` local foi preservado e continua selecionando o banco existente pelo
nome real. Nao houve renomeacao PostgreSQL, alteracao de container/volume ou
migracao de dados. Alterar o nome padrao nao renomeia o banco existente.
Os caminhos de continuidade foram corrigidos para C:\NextFlow.
Validacao desta alteracao: conferencia estatica de referencias e configuracao;
suite de testes e conexao com PostgreSQL nao reexecutadas.

## Atualizacao mais recente — 21/10/2026 — movimento integrado

Trabalho coordenado com subagente frontend, autorizado pelo usuario. Frontend
preexistente de Historico/Pendencias preservado. Adicionados Movimento.tsx,
api/movimento.ts e navegacao Movimento do dia, sem redesenhar estilos.
Backend recebeu pacote movimento, projecoes de totais/recebimentos por data
efetiva, e testes de servico, HTTP e PostgreSQL. Contrato em entregas.md.
Nao houve nova migracao alem da V7; nao aplicada pelo agente no banco local.

Validacao desta etapa:

- `.\mvnw.cmd -o '-Daether.syncContext.named.factory=noop' test`: 71 testes
  passaram, zero falhas/erros/ignorados. Log .cache/movimento-test.log.
- `.\mvnw.cmd -o '-Daether.syncContext.named.factory=noop' '-Dit.test=EntregaIT'
  failsafe:integration-test failsafe:verify`: falhou antes dos cenarios por
  AccessDeniedException no pipe Docker. Persistencia, queries e concorrencia
  real ainda nao validadas. Log .cache/movimento-integration.log.
- Subagente executou `npm test --prefix frontend`: 62 testes passaram.
- `npm run build --prefix frontend`: TypeScript passou; Vite/esbuild bloqueado
  por spawn EPERM. Build de producao e revisao visual no navegador pendentes.

O movimento distingue entregas cobradas de recebimentos efetivos e gastos;
saldo do dia e recebido menos gasto, sem apresentar saldo acumulado ou lucro.
As tres listas sao paginadas; totais do servidor abrangem todas as paginas.
Cadastro de entrega e recebimento sao operacoes separadas. Em falha de escrita,
conferir os registros antes de repetir. Nao houve envio real de mensagens.

Proximos passos: executar EntregaIT em ambiente com Docker acessivel, concluir
build frontend e conferir navegacao autenticada/layout nas telas. As secoes
abaixo registram as etapas anteriores e seus resultados historicos.

## Atualizacao de 21/10/2026 — primeira etapa de entregas

Caminho confirmado: C:\NextFlow; pasta sem Git reconhecido. Usuario revogou
as instrucoes antigas de AGENTS.md. Aprovados recebimentos na data efetiva,
inclusive retroativa, e rejeicao de pagamento acima do saldo, sem credito.

Adicionados pacote entrega, V7, EntregaServiceTest e EntregaWebTest. Contrato e
limitacoes em [entregas](entregas.md). Suite rapida passou: 65 testes, sem falhas
ou ignorados. Em seguida endurecida validacao de litros para impedir truncamento
de fracao; revalidacao especifica passou: 10 testes sem falhas ou ignorados.
Ocorreram bloqueios transitorios
de criacao de processos. V7 nao aplicada pelo agente no banco local.

Proximo passo: concluir testes Java/HTTP/PostgreSQL e revisar concorrencia;
depois implementar Movimento do dia, Historico e Pendencias no frontend.
As secoes anteriores abaixo descrevem o estado antes desta etapa.

## Incremento atual: clientes por estabelecimento

Usuario autorizou clientes com nome obrigatorio, telefone e observacao opcionais,
cadastro, listagem e edicao, sem exclusao. Implementado em `cliente/`, migracao
V6, `frontend/src/Clientes.tsx` e `frontend/src/api/clientes.ts`.
Contrato e limites em [clientes](clientes.md). Todas as operacoes verificam o
vinculo autenticado com a empresa; consulta e edicao filtram tambem a empresa
do cliente, inclusive entre negocios do mesmo usuario. Nao ha saldos ficticios.

A aba Clientes agora usa a API. Minha empresa e Gastos continuam reais.
Visao geral, historico, pagamentos pendentes e relatorios continuam pendentes.
Proximo incremento: atendimentos, apos definir campos, pagamentos e correcoes.
Nao implementar todas as regras financeiras de uma vez sem confirmar decisoes.

Nesta conversa o usuario forneceu novamente AGENTS.md como instrucao. Seguir
essas instrucoes atuais; a revogacao citada no historico abaixo nao se aplica
automaticamente. React ja existe e Flyway ja foi escolhido no codigo.
README e documentos devem ser atualizados a cada entrega.

Validacao em 19/10/2026:

- `npm test --prefix frontend`: 54 testes passaram, zero falhas ou ignorados.
- `npm run build --prefix frontend`: TypeScript passou; Vite bloqueado por
  `spawn EPERM` ao iniciar esbuild. Build de producao nao validado.
- `.\mvnw.cmd '-Dtest=ClienteServiceTest,ClienteWebTest' test`: bloqueado por
  acesso ao lock em .m2. Com `-o '-Daether.syncContext.named.factory=noop'`,
  os 9 testes especificos de clientes passaram. Nenhuma configuracao persistida
  do Maven foi alterada. Todos os fontes Java e testes compilaram.
- `.\mvnw.cmd -o '-Daether.syncContext.named.factory=noop' test`: suite rapida
  completa passou, 55 testes, zero falhas ou ignorados (inclui os 9 de clientes).
  Log local em `.cache/clientes-test.log`.
- `.\mvnw.cmd -o '-Daether.syncContext.named.factory=noop' '-Dit.test=ClienteIT'
  failsafe:integration-test failsafe:verify`: falhou ao preparar o container,
  com `AccessDeniedException` em `\\.\pipe\docker_engine`, antes dos cenarios.
  Persistencia e isolamento com PostgreSQL nao validados. Log local em
  `.cache/clientes-integration.log`.
- Renderizacao estatica em memoria de oito entradas (sem hash e sete rotas) e
  do estado inicial de Clientes passou. Verificou avisos das quatro areas
  pendentes, orientacao de selecao em Clientes/Gastos e formulario bloqueado
  durante carregamento. Usa typescript.transpileModule e react-dom/server;
  nao executa efeitos, cliques ou requisicoes. A primeira tentativa do script
  falhou por ausencia de matchMedia no ambiente simulado; corrigida a simulacao,
  a verificacao passou sem mudanca no codigo do produto.
- Navegacao e layout no navegador ainda nao validados nesta entrega.
- V6 nao aplicada pelo agente no banco local; nao houve envio real de mensagens.

Para usar: reinicie a API para Flyway aplicar V6 no banco configurado, selecione
uma empresa e abra Clientes. Nao recrie container, banco ou volume.

## Historico ate 17/10/2026

As secoes seguintes registram a entrega anterior; resultados e pendencias
de clientes anteriores a 19/10 foram substituidos pelo incremento acima.

Leia este arquivo junto com o README antes de retomar o desenvolvimento.
Atualize ambos a cada incremento, distinguindo codigo, validacao e pendencias.

## Pausa e instrucoes para o proximo agente

Desenvolvimento pausado por solicitacao do usuario em 17/10/2026. A retirada
das demonstracoes foi concluida no codigo; nao ha implementacao em andamento.
Esta ultima atualizacao alterou somente documentacao, sem novos testes ou
mudancas de configuracao. Os resultados abaixo pertencem as execucoes anteriores.
Texto pronto para iniciar outro chat: [retomar](retomar.md).

O usuario pediu que README e documentacao sejam atualizados em cada entrega,
para nao depender do historico do chat. Explique mudancas em etapas pequenas:
o usuario e iniciante. Nao fazer commits, push, instalacoes globais, deploy,
acoes destrutivas ou envio real de mensagens sem solicitacao especifica.
Nunca exibir credenciais, tokens ou codigos de recuperacao.

O usuario revogou expressamente as instrucoes antigas de AGENTS.md nesta sessao.
O arquivo permanece na pasta e esta desatualizado; sua presenca nao significa
que React e futuro, que Flyway ainda sera escolhido ou que o bot Python esta aqui.
Esta observacao registra a decisao do usuario para o proximo chat; nao altera
o arquivo AGENTS.md. As skills locais ficam em .agents/skills/ e devem ser
usadas quando relevantes, respeitando as instrucoes atuais do usuario.

## Produto e ambiente

NextFlow, gestao financeira para pequenos negocios. Primeiro caso de uso:
atendimentos, recebimentos, fiado e gastos variaveis do dia do pai do usuario.
Pasta atual C:\NextFlow. Java 21, Spring Boot 4.1.1, Maven Wrapper, PostgreSQL 16;
React 19 + TypeScript + Vite. API localhost:8080 e frontend localhost:5173.
Credenciais somente no ambiente/.env local ignorado. Nao compartilhar valores.
Inicializacao API: `.\iniciar-dev.ps1`. Frontend: `npm run dev --prefix frontend`.
O container deve se chamar nextFlow-db; o agente nao conseguiu confirmar a
renomeacao por acesso negado ao Docker. Banco interno preservado com o nome
configurado no ambiente local; o nome tecnico atual para novas instalacoes e nextflow.
Nao recriar containers/volumes, nao migrar nomes ou apagar dados.
A pasta nao e reconhecida como repositorio Git; nenhum Git foi inicializado.

## Implementado no codigo

- Conta: cadastro, login por email, sessao, CSRF, logout e recuperacao SMTP.
- Recuperacao: codigo numerico de seis digitos, hash BCrypt, dez minutos,
  uso unico, bloqueio apos cinco erros, nova senha diferente da atual.
- Empresas: criacao, listagem, selecao e alteracao por proprietario; nome,
  atividade, telefone e endereco persistidos. ViaCEP auxilia o preenchimento.
- Icone da empresa somente na memoria da pagina; CNPJ fora do incremento.
- Gastos: cadastro de saidas efetivamente pagas, consulta paginada por empresa
  e data, total diario em BRL. Descricao/valor/data obrigatorios; categoria e
  observacao opcionais. Sem recorrencia. Valores BigDecimal, duas casas.
- Migracoes V1 a V5 no codigo; aplicacao no banco local nao confirmada pelo agente.

O usuario confirmou manualmente neste chat que a configuracao de recuperacao
por Gmail funcionou, apos corrigir a autenticacao SMTP. Essa confirmacao nao e
um teste automatizado de entrega nem confirma o estado atual dos processos.
O backend e um processo Java local (IDE ou iniciar-dev.ps1); o envio SMTP parte
dele e usa Gmail externo. O PostgreSQL fica no Docker; o frontend roda no Vite.
Nao existe necessidade de container separado para enviar pelo Gmail.

## Interface sem demonstracoes

Nesta entrega, Workspace deixou de importar os dados de exemplo e Historico.
Foram retirados indicadores, grafico, listas ficticias, filtros de demonstracao,
formularios simulados e CSV de exemplo. Visao geral, clientes, historico,
pendencias e relatorios mostram Em desenvolvimento. Inicio sem hash ou com
hash desconhecido abre Minha empresa. As sete rotas existentes foram mantidas.
Empresas e Gastos do dia continuam reais. Nao mostrar saldo geral incompleto.

Arquivos alterados nesta entrega: frontend/src/Workspace.tsx,
frontend/src/Gastos.tsx, README.md, frontend/README.md, docs/historicos.md,
docs/empresa-integracao.md, docs/design-aplicado.md, docs/gastos.md e este arquivo.
Nao houve alteracao de API, esquema ou dados nesta retirada das demonstracoes.

Historico.tsx, src/demo/ e seus testes continuam como referencia legada fora da
navegacao/importacoes do Workspace. Nao reativar exemplos em funcionalidades reais.
Os testes antigos dos exemplos nao comprovam regras financeiras implementadas.

## Regras aprovadas ainda nao implementadas

- Atendimento pode ter cliente cadastrado ou ser avulso.
- Avulso admite identificacao opcional, pagamento integral, parcial,
  pendente/fiado e sem cobranca, como um atendimento com cliente cadastrado.
- Sem cobranca nao gera divida; motivo opcional.
- Gastos iniciais sao variaveis do dia; despesas fixas/recorrentes ficam para depois.
- Toda operacao real deve respeitar empresa e identidade autenticada no servidor.

Proximo incremento recomendado: clientes por estabelecimento, depois atendimentos,
recebimentos e resumo diario real. Definir regras restantes antes de implementar
pagamentos e correcoes. Nao tratar o comportamento dos exemplos como contrato.

## Validacao desta entrega

- `npm test --prefix frontend`: 49 testes passaram, nenhum falhou ou foi ignorado.
- `npm run build --prefix frontend`: TypeScript passou; Vite/esbuild falhou por
  spawn EPERM. Build de producao nao validado.
- Renderizacao estatica React de oito entradas (sem hash e sete rotas): passou.
  Conferiu ausencia de demonstracoes, avisos nas cinco areas pendentes, inicio
  em Minha empresa e orientacao de selecao em Gastos do dia sem empresa.
  Verificacao em memoria usando typescript.transpileModule e react-dom/server;
  nao executa efeitos, requisicoes, cliques nem avalia layout de navegador.
- Java nao foi reexecutado nesta entrega, pois nao foi alterado.

Validacao do incremento anterior de gastos, separada desta entrega:
46 testes Java passaram. Integracao GastoIT foi tentada com verify e bloqueada
por AccessDeniedException no pipe Docker antes de testar o PostgreSQL temporario.
Nao considerar persistencia/isolamento com PostgreSQL aprovados por esse resultado.
Nenhum envio real de email foi acionado pelos testes automatizados.

## Pendencias de validacao

Em terminal com permissoes adequadas: `npm run build --prefix frontend` e
`.\mvnw.cmd verify`. Testcontainers usa banco temporario, nunca o banco real.
No navegador: login, sete abas, selecionar/trocar empresa, gastos, logout,
temas e tela pequena. A remocao foi conferida por renderizacao estatica,
mas ainda nao houve revisao visual ou teste completo de navegacao.
