# Estabelecimentos e isolamento

Um usuario pode administrar varios negocios. `Estabelecimento` representa o
negocio; `VinculoEstabelecimento` relaciona o usuario ao negocio e guarda seu papel.
Nesta entrega existe somente `PROPRIETARIO`, um por estabelecimento. Nao ha
convites, funcionarios, edicao, exclusao ou desativacao ainda.

## Contrato HTTP

Todas as rotas exigem login pela sessao existente. POST exige tambem CSRF.

| Metodo e rota | Entrada | Resposta |
| --- | --- | --- |
| POST `/api/estabelecimentos` | JSON `{"nome":"Meu negocio"}` | 201, DTO e cabecalho Location |
| GET `/api/estabelecimentos?pagina=0&tamanho=20` | Pagina com indice zero; tamanho de 1 a 100 | 200, itens/pagina/tamanho/total |
| GET `/api/estabelecimentos/{id}` | UUID do estabelecimento | 200 ou 404 |

O DTO possui `id`, `nome`, `ativo`, `moeda` e `fuso`. Nome e obrigatorio, ate
120 caracteres; espacos nas pontas sao removidos. A ordenacao e fixa por nome e ID.
Novo negocio nasce ativo, com BRL e America/Sao_Paulo. Esses valores sao definidos
pelo servidor. Campos adicionais enviados no JSON nao definem proprietario ou
permissoes. O ID do usuario vem exclusivamente da identidade autenticada.

O total da pagina conta somente os negocios vinculados ao usuario. UUID
inexistente e negocio alheio retornam o mesmo 404. As entidades JPA nao sao
serializadas diretamente: DTOs definem os dados que podem sair pela API.

## Como funciona

Controller recebe e valida HTTP; service executa a regra; repositories consultam
o PostgreSQL. `@Transactional` na criacao garante que estabelecimento e vinculo
sejam gravados juntos. Se o vinculo falhar, o estabelecimento tambem e desfeito.
As consultas usam `usuarioId + estabelecimentoId`, em vez de buscar so pelo ID.

A migracao V2 adiciona duas tabelas, chaves estrangeiras, unicidade do vinculo e
um indice que impede segundo proprietario. Nao altera V1 nem apaga dados.
Flyway aplica V2 na proxima inicializacao; Hibernate valida o resultado.

Futuros clientes, vendas e despesas precisarao do estabelecimento selecionado e
de autorizacao em cada operacao. Este modulo sozinho nao garante isolamento de
funcionalidades que ainda nao existem. Novos papeis precisarao de regras de
permissao e nova migracao. Inativacao e operacoes financeiras terao suas regras
definidas antes da implementacao. Alterar moeda nunca devera reinterpretar valores
financeiros antigos.

## Validacao

`EstabelecimentoServiceTest` e `EstabelecimentoWebTest` rodam com `mvnw.cmd test`:
validacao, consultas filtradas, autenticacao, CSRF e proprietario forjado.
`EstabelecimentoIT` roda com `mvnw.cmd verify` em PostgreSQL 16 temporario:
isolamento de dois usuarios, multiplos negocios, contagem paginada, rollback
quando o vinculo falha e restricoes de integridade. O banco local nao e usado.
