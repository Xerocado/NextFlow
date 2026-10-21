# Clientes por estabelecimento

Incremento de 19/10/2026: cadastro, listagem paginada, consulta e edicao de
clientes reais pela API e pela aba Clientes. Selecione a empresa em Minha empresa.

## Regras deste incremento

- Nome obrigatorio, ate 120 caracteres.
- Telefone opcional, ate 30 caracteres; aceita numeros e formatacao `+ ( ) . -` e espacos.
- Observacao opcional, ate 500 caracteres.
- Espacos nas pontas sao removidos; opcionais vazios sao armazenados como null.
- Cada cliente pertence a uma unica empresa. Nomes e telefones podem se repetir.
- Edicao substitui os tres campos; enviar opcional vazio limpa o valor anterior.
- Sem exclusao, saldo, atendimentos, recebimentos ou envio de mensagens.

## Contrato HTTP

Base: `/api/estabelecimentos/{empresaId}/clientes`.

| Metodo | Rota relativa | Resultado |
| --- | --- | --- |
| POST | base | 201, cliente e Location |
| GET | base?pagina=0&tamanho=20 | 200, itens/pagina/tamanho/total |
| GET | base/{id} | 200, cliente |
| PUT | base/{id} | 200, cliente atualizado |

POST e PUT recebem `{ "nome": "Cliente exemplo", "telefone": "", "observacao": "" }`.
Resposta de cliente: `id`, `nome`, `telefone`, `observacao`.
Pagina com indice zero; tamanho de 1 a 100; ordenacao por nome e UUID.
Nao ha busca por nome neste incremento.

Toda rota exige sessao. Escritas exigem CSRF e proprietario; leituras exigem
vinculo com a empresa. Usuario vem da sessao; empresa vem da rota autorizada,
nunca de campos de identidade enviados no corpo. Consulta e edicao combinam
ID do cliente com ID da empresa, inclusive entre empresas do mesmo usuario.
Empresa alheia e empresa inexistente retornam 404; cliente de outra empresa e
cliente inexistente tambem retornam 404. Validacao: 400; sem sessao: 401;
CSRF invalido: 403. Entidades JPA nao sao expostas diretamente.

## Banco e interface

V6 cria tabela clientes e indice por empresa/nome/ID. Nao modifica V1-V5 nem
registros existentes. A aplicacao no banco local nao foi executada pelo agente.
Flyway aplicara V6 ao iniciar a API; nao recrie banco, container ou volume.

A tela possui estados de carregamento, erro e lista vazia, paginacao e edicao.
Trocar empresa desmonta a tela anterior e cancela sua consulta. A interface
nao persiste contatos no navegador nem exibe saldos simulados. Nao ha repeticao
automatica de escrita. Em falha de envio, Atualizar lista cancela a edicao e
permite conferir os dados antes de tentar novamente.

## Validacao

- ClienteServiceTest: validacao, normalizacao, paginacao e autorizacao.
- ClienteWebTest: sessao, CSRF, campos invalidos, identidade forjada e 404.
- ClienteIT: PostgreSQL temporario, persistencia, edicao e isolamento HTTP.
- frontend/tests/clientes.test.mjs: cliente HTTP com fetch simulado.

Em 19/10: 55 testes rapidos Java e 54 frontend passaram. TypeScript passou;
build Vite bloqueado por spawn EPERM. ClienteIT foi tentado e falhou por acesso
negado ao pipe Docker antes dos cenarios. Renderizacao estatica de rotas e estado
inicial passou, sem efeitos/cliques; revisao no navegador continua pendente.

Resultados efetivamente executados e limitacoes em [estado atual](estado-atual.md).
Testes com mocks nao comprovam persistencia nem navegacao completa.
