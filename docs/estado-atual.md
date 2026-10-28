# Estado atual e continuidade — 19/10/2026

## Atualização — 28/10/2026 — reenvio seguro de lançamentos

Implementado `Idempotency-Key` opcional para criação de entrega, pagamento e
gasto. A V8 guarda permanentemente, por empresa/operação/chave, somente hash
SHA-256, ID do resultado e instante; payload e dados pessoais não são copiados.
Chave igual e conteúdo igual retornam o resultado original; conteúdo ou entrega
de destino diferentes retornam HTTP 409. A gravação é atômica com o lançamento;
o teste de rollback confirma que ambos somem juntos. Um teste concorrente de
pagamento confirma um recebimento para duas requisições simultâneas. A interface
persiste somente chave/hash em `sessionStorage` e reutiliza após recarregar.

Validação executada nesta atualização: `.\mvnw.cmd -o verify` passou com 71
testes rápidos e 35 integrados em PostgreSQL 16.15 descartável; Flyway validou
e aplicou V1–V8. `npm test --prefix frontend` passou (71) e
`npm run build --prefix frontend` passou. `node scripts/validar-interface.mjs`
passou com 19/19 cenários em Edge 156.0.4314.50, incluindo reenvio com resposta
perdida, desktop/mobile, isolamento, cancelamento de consultas e Mailpit local.
Os contêineres e processos temporários foram encerrados pelo roteiro; nenhum
volume operacional foi usado. Limites atuais: o header é
opcional para clientes legados, não existe expurgo das linhas permanentes e a
garantia frontend depende do `sessionStorage` disponível. Idempotência não cobre
outros papéis, edições, estornos ou qualquer operação fora das três criações.

## Revalidação — 28/10/2026

Registro da validação anterior à paginação independente e à idempotência; os
resultados e o estado mais recentes estão nas atualizações acima.

Antes de abrir os próximos incrementos, repeti a validação da base na branch
`feat/estabilidade-operacional`. `npm test --prefix frontend` passou com 68
testes; `npm run build --prefix frontend` passou com TypeScript e Vite.
`.\mvnw.cmd -o verify` passou com 71 testes rápidos e 31 integrados, todos
sem falhas ou ignorados. Os testes integrados aplicaram V1–V7 em bancos
PostgreSQL 16.15 temporários do Testcontainers. Uma execução anterior falhou
porque o Docker Desktop estava parado; após autorização do mantenedor, ele foi
iniciado somente para as verificações. Nenhum volume operacional foi alterado.

`node scripts/validar-interface.mjs` também passou com 18 cenários em Edge
156.0.4314.50, incluindo sessão/CSRF, entregas, pagamentos, isolamento,
movimento, troca de empresa, SMTP local e viewports mobile. O build gerou JS de
295,65 kB (87,44 kB gzip) e CSS de 19,48 kB (4,61 kB gzip). Capturas e logs
ficaram em `.cache/navegacao-1793187917122/`, ignorado pelo Git.

O commit `27e7013` foi enviado para `origin/feat/estabilidade-operacional`, após
revisão do diff e das validações. `gh` não está instalado; o envio usou Git.
As mudanças locais preexistentes em `AGENTS.md`,
`docs/plano-open-source-e-uso-real.md` e `end` continuam fora dos commits.

## Atualização — 28/10/2026 — paginação independente do movimento

`frontend/src/Movimento.tsx` agora consulta entregas, recebimentos e gastos de
forma independente. Ao mudar a página de gastos, só a lista de gastos é
consultada; resumo e listas anteriores permanecem visíveis. Atualizar o dia ou
solicitar atualização continua recarregando os dados aplicáveis. Erros,
carregamento e cancelamento são tratados por lista.

`npm test --prefix frontend`: 68 testes aprovados;
`npm run build --prefix frontend`: TypeScript e Vite aprovados.
`node scripts/validar-interface.mjs`
aprovou os 18 cenários em Edge, agora verificando também que paginar gastos
envia somente uma consulta de gastos. Artefatos em
`.cache/navegacao-1793188428703/`. Não houve alteração de backend, banco ou
contrato financeiro nesta melhoria.

## Atualização — 27/10/2026 — navegação isolada e correções de interface

Concluído o roteiro de navegação em Edge headless com backend real e PostgreSQL
descartável: **18 cenários aprovados**, incluindo sete seções, pagamento parcial
e posterior, gastos/totais, isolamento, foco por teclado, temas e larguras
responsivas 390/360 px. Clientes, entregas, gastos e movimento também passaram
com GET real atrasado até a troca de empresa.

Dois defeitos reproduzidos e corrigidos: empresa ativa ausente no cabeçalho mobile
e tela antiga mantida após 401 de sessão invalidada. Workspace/estilos agora
mostram a empresa com menu fechado. App e `api/sessao.ts` conduzem ao login, sem
repetir escrita; respostas 401 simultâneas/antigas não invalidam um novo login.
Os cinco clientes HTTP de negócio usam esse tratamento preservando suas opções,
cancelamento e mensagens. Login incorreto e 403 não disparam expiração.

Novos arquivos: `scripts/validar-interface.mjs`, `frontend/e2e/fluxo.mjs`,
`frontend/e2e/vite.config.ts`, `frontend/src/api/sessao.ts`,
`frontend/tests/sessao.test.mjs` e [guia de reprodução](validacao-interface.md).
O roteiro usa portas exclusivas (18080/15173), PostgreSQL em tmpfs e Mailpit
local, sem volumes operacionais, `.env` ou credenciais herdadas. Nada foi instalado.
Playwright já disponível foi autorizado pelo mantenedor após falha do controle
nativo. A primeira execução completa reproduziu os defeitos; a final passou.

Verificações desta continuação:

- `.\mvnw.cmd -o '-DskipTests' package`: JAR gerado; não executa testes.
- `npm test --prefix frontend`: 68 testes aprovados, incluindo cinco novos
  para 401 concorrente/atrasado, cancelamento, 403/rede e senha incorreta.
- `npm run build --prefix frontend`: TypeScript e Vite aprovados.
- `node scripts/validar-interface.mjs`, com `PLAYWRIGHT_PACKAGE` apontando ao
  pacote instalado: 18 cenários aprovados; saída zero.
- Capturas desktop claro/escuro e mobile revisadas; processos e containers
  temporários encerrados. Registros em `.cache/navegacao-1793105690092/`.

A captura SMTP passou usando `--smtp-disable-rdns` somente no Mailpit de teste;
timeouts/configuração de produção não foram alterados. A navegação anterior
pendente ficou coberta no escopo do guia, com navegador real e viewports
responsivos; não houve teste em aparelho físico ou espera pelo timeout da sessão.
Java e migrações não mudaram; os resultados Java da etapa anterior permanecem
identificados abaixo, sem nova execução da suíte. A base não está declarada
pronta para operação: idempotência e preparação operacional continuam pendentes.

Preservadas todas as alterações locais da etapa anterior, `AGENTS.md`, o plano
open source e `end`. Nenhum stage, commit, instalação, deploy ou envio externo.
Próximo incremento: definir o contrato de idempotência, antes da implementação.

## Atualização — 27/10/2026 — validação da base existente

Incremento de validação, sem novos módulos ou alteração de regras financeiras.
Pasta confirmada: `C:\NextFlow`. Git já inicializado. Preservados `AGENTS.md`
modificado e os arquivos não rastreados `docs/plano-open-source-e-uso-real.md`
e `end`, encontrados antes do trabalho. Nenhum stage, commit, push ou deploy.

### Resultados executados

Ambiente observado: Temurin Java 21.0.12.1, Node 24.21.0, npm 11.19.0,
Docker Server 29.8.2. A imagem local `postgres:16-alpine` executou PostgreSQL
16.15. Dependências e imagens já estavam instaladas; nada foi instalado.

| Comando | Resultado desta sessão |
| --- | --- |
| `.\mvnw.cmd -o test` | 71 testes rápidos aprovados |
| `.\mvnw.cmd -o verify` | 71 rápidos e os 25 testes integrados então existentes aprovados |
| `.\mvnw.cmd -o '-Dit.test=EntregaIT' verify` | Após ampliar EntregaIT: 71 rápidos e 8 integrados aprovados, incluindo seis novos |
| `npm test --prefix frontend` | 63 testes aprovados após a correção, nenhum ignorado |
| `npm run build --prefix frontend` | TypeScript e Vite aprovados após a correção |
| `git diff --check` | Sem erros de whitespace |

As duas execuções integradas cobrem 31 cenários distintos; não representam uma
execução única de 31 testes. A suíte completa rodou antes da ampliação de
EntregaIT; depois foi reexecutada a classe alterada e toda a suíte rápida.
Não houve alteração do código backend de produção ou das migrações.

O sandbox bloqueou acesso ao cache Maven, ao pipe Docker e a criação do esbuild
(`spawn EPERM`). As execuções autorizadas fora do sandbox passaram, sem desativar
locks, proteções ou modificar configuração persistente. Uma tentativa intermediária
de `test-compile` também foi bloqueada pelo cache; o `verify` posterior compilou
todos os testes. `-o` usa o cache Maven existente; uma máquina nova precisa obter
as dependências antes de executar offline.

Logs locais ignorados pelo Git: `.cache/validacao-backend.log`,
`.cache/validacao-integracao.log`, `.cache/validacao-entregas.log`,
`.cache/validacao-frontend.log` e `.cache/validacao-build.log`.
Relatórios JUnit em `target/surefire-reports/` e `target/failsafe-reports/`.
Bundle final: JS 294,98 kB (gzip 87,29 kB), CSS 19,26 kB (gzip 4,57 kB).
Esses tamanhos não são uma medição de desempenho de navegação.

### Evidências e correção

| Fluxo prioritário | Evidência executada e alcance |
| --- | --- |
| Autenticação, sessão e CSRF | AutenticacaoIT: cadastro, login com token obtido da API, logout, recuperação com e-mail mock, revogação de sessão e concorrência; MockMvc com banco real descartável |
| Empresas e clientes | EstabelecimentoIT e ClienteIT: persistência, paginação, autorização, identidade forjada e separação entre usuários/empresas |
| Entregas e pagamentos | EntregaIT: avulso e cadastrado, sem cobrança, parcial, quitação posterior, excesso, data futura e preservação do nome histórico do cliente |
| Datas e totais | EntregaIT e GastoIT: recebimento pela data efetiva, totais de todas as páginas e exclusão de outras datas/empresas |
| Precisão | Centavos, limite de R$ 999.999.999.999,99 por lançamento e agregado acima desse limite verificados em BigDecimal/PostgreSQL; isso não comprova precisão de agregados extremos no frontend |
| Concorrência e rollback | Dois pagamentos concorrentes não excedem o saldo; falha simulada após flush e releitura desfaz tanto o pagamento quanto o saldo na transação real |
| Isolamento de entregas | HTTP via MockMvc: detalhe, listas, totais e recebimento negados a outro usuário; detalhe/recebimento negados sob outra empresa do mesmo dono |
| Migrações | V1–V7 aplicadas nos PostgreSQL temporários; Flyway validou as sete e Hibernate validou o esquema |

Defeito confirmado no código: o link `href="#conteudo"` alterava o hash usado
pelas rotas; `secaoAtual` interpretava esse destino como seção desconhecida e
selecionava Minha empresa. Extraído `components/PularConteudo.tsx`: o handler
cancela a navegação e solicita foco no conteúdo; os elementos `main` de login e
Workspace recebem `tabIndex={-1}` para aceitar foco programático sem entrar na
sequência normal de Tab. Teste unitário verifica cancelamento e chamada de foco.
Não é um teste de interação em navegador nem comprovação visual de acessibilidade.

### Isolamento e limitações

Todos os testes PostgreSQL usaram containers temporários de Testcontainers com
`@ServiceConnection`, sem montagem do volume operacional. O envio de recuperação
foi substituído por mock nos testes que o acionam. Nenhuma API para navegação foi
iniciada, nenhum `.env` foi lido/alterado e não houve envio real de mensagens.

Navegação desktop/mobile **não validada**: a ferramenta de controle retornou
lista vazia de navegadores/apps e erro de conexão com o pipe nativo. Portanto,
seleção da empresa na interface, efeitos/cliques, foco real, layout e troca de
empresa com resposta atrasada continuam pendentes. A inspeção encontrou chaves
por empresa e AbortController nos componentes, mas isso não substitui o teste
de interação. Os testes frontend incluem material legado e mocks/renderização
estática; o número total não representa cobertura do fluxo completo.

Pendências preservadas: idempotência, consulta inicial de dívidas antigas,
recuperação durável, sessão expirada na interface, contexto da empresa no mobile,
consultas independentes ao paginar movimento e contrato exato para agregados
monetários extremos. Estornos, novos papéis, veículos, licença e produção não
entraram no incremento. A base ainda não está declarada pronta para uso real.

Próximo passo: concluir navegação autenticada desktop/mobile em banco descartável,
com SMTP fake/receptor local confirmado antes de iniciar a API, incluindo resposta
atrasada ao trocar empresa e o link de salto. Depois, preparar o contrato de
idempotência em entrega própria. As seções abaixo são registros históricos.

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
