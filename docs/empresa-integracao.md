# Cadastro da empresa

## Incremento atual: dados complementares

O formulario inferior agora carrega e salva atividade, telefone e endereco da
empresa selecionada. O nome continua no painel superior. CNPJ fica fora deste
incremento; o icone permanece apenas na memoria da pagina.

`PUT /api/estabelecimentos/{id}/dados` substitui os dados complementares, sem
alterar o nome. Consultas retornam `dados` (null para cadastro ainda incompleto).
Exige sessao, CSRF e vinculo PROPRIETARIO; empresa alheia retorna 404.

Atividade obrigatoria: servicos, produtos ou ambos. Telefone opcional, ate 30
caracteres, aceita digitos e formatacao. CEP opcional: oito digitos, com ou sem
hifen. UF opcional: sigla brasileira maiuscula. Numero obrigatorio, exceto com
semNumero=true, quando deve estar vazio. Limites: logradouro 150, numero 20,
complemento/bairro/cidade 100. Demais campos do endereco sao opcionais.

A migracao V4 adiciona colunas sem remover os registros existentes. Reinicie
a API antes de usar o novo frontend; Flyway aplicara a migracao. Nao recrie o
banco nem o volume. A busca ViaCEP continua como auxilio ao preenchimento.

Validacao manual: salvar, recarregar, alternar empresas e conferir os dados;
testar numero e sem numero. Em falha de rede, reabra a aba para conferir se a
gravacao ocorreu antes de repetir. Clientes por estabelecimento estao implementados;
veja [clientes](clientes.md).

## Nome e selecao

Em Minha empresa, o painel **Empresa no banco de dados** usa a API real.
Escolha uma empresa ou selecione Cadastrar nova empresa, informe o nome e salve.
O nome aparece na lateral e permanece no PostgreSQL ao recarregar. Quando ha
uma unica empresa, ela e selecionada automaticamente. Com varias, escolha
explicitamente a empresa na aba Minha empresa. A escolha nao e persistida.

O cadastro inicial exige somente o nome; os dados complementares podem ser
preenchidos depois. Historicos, pendencias e relatorios mostram Em desenvolvimento. Gastos do dia usam a empresa selecionada e dados reais.

## Contrato e seguranca

- POST /api/estabelecimentos: cria estabelecimento e vinculo com o usuario autenticado.
- GET /api/estabelecimentos: lista paginada filtrada pelo usuario autenticado.
- GET /api/estabelecimentos/{id}: consulta empresa vinculada ao usuario autenticado.
- PUT /api/estabelecimentos/{id}/nome: recebe somente `{ "nome": "Empresa exemplo" }`.
- PUT /api/estabelecimentos/{id}/dados: substitui atividade, telefone e endereco.
- Alterar exige vinculo PROPRIETARIO. Ausente ou de outro usuario resulta no mesmo 404.
- Escritas usam cookie de sessao e CSRF. O cliente nunca escolhe o proprietario.
- Nome obrigatorio, nao branco e limitado a 120 caracteres na API.

O service usa uma transacao: o Hibernate detecta as mudancas na entidade
carregada e grava no commit. A migracao V4 adicionou os dados complementares.

Nao ha repeticao automatica de POST. Se houver falha de rede, atualize a lista
antes de cadastrar novamente: a requisicao pode ter sido gravada mesmo sem
o navegador receber a resposta. A tela bloqueia cadastro se a lista nao carregar.

## Verificacao

`npm test --prefix frontend` valida o cliente HTTP com fetch simulado.
`.\mvnw.cmd test` verifica regras, sessao, CSRF e autorizacao com mocks.
`.\mvnw.cmd verify` inclui PostgreSQL temporario/Testcontainers e verifica que
o nome persiste e outro usuario nao consegue altera-lo. Nao usa o banco real.

O frontend valida os campos antes de buscar CSRF e enviar a escrita. A API
continua responsavel por validar e autorizar todas as operacoes. Propriedades
fora da lista editavel (como usuarioId, nome e moeda) nao seguem no envio dos
dados complementares. A consulta de dados pode ser cancelada ao trocar de
empresa ou sair da tela. Em falha inicial, use Tentar carregar dados novamente.

Os testes Node cobrem formatos, limites, campos opcionais, cancelamento, falhas
de rede, CSRF e ausencia de repeticao automatica. Os testes web Java cobrem
payloads invalidos e identidade forjada. Os testes PostgreSQL tambem verificam
isolamento HTTP em leitura, listagem, nome e dados, e que escritas negadas nao
alteram os registros. Testes Node/web com mocks nao comprovam persistencia nem
os atributos do cookie emitido por um servidor real.

Clientes por estabelecimento possuem cadastro, listagem e edicao. Veja [clientes](clientes.md).

