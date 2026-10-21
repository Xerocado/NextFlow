# Validacao de seguranca e cadastro da empresa — 15/10/2026

## Escopo

Ampliacao dos testes de autorizacao e isolamento entre usuarios, validacao dos
dados complementares e tratamento de falhas no cadastro da empresa. Sem mudanca
de regras financeiras, de autenticacao, de banco local ou de configuracao do Windows.

## Correcoes

- O formulario permite repetir uma carga que falhou, sem sair da aba.
- Consultas pendentes sao canceladas ao desmontar o formulario/trocar de empresa.
- Os dados sao normalizados e validados antes de buscar CSRF ou enviar a escrita.
- A UF e convertida para maiusculas; sem numero descarta o numero anterior.
- Somente os campos editaveis sao incluidos no corpo de dados complementares.
- Erros 400 orientam a conferir os campos; 429 informa excesso de tentativas.

## Resultados executados

| Verificacao | Resultado |
| --- | --- |
| `npm test --prefix frontend` | 45 testes passaram, zero falhas ou ignorados |
| `npm run build --prefix frontend` | TypeScript passou; Vite falhou com spawn EPERM ao iniciar esbuild |
| Build com `--configLoader runner` | Bloqueado por spawn EPERM em subprocesso de resolucao de caminhos do Vite |
| Maven `verify` offline, com lock em memoria | 39 testes rapidos passaram; integracao falhou na inicializacao do Docker |
| Testes HTTP PostgreSQL adicionados | Compilaram; execucao bloqueada antes dos metodos |

O Maven foi executado com:

```powershell
.\mvnw.cmd '-Daether.syncContext.named.factory=noop' -o verify
```

O parametro de locks foi usado apenas nesta sessao restrita, para leitura do cache
Maven sem criar locks fora do workspace. Nao foi gravado na configuracao do projeto.

As tres classes de integracao (AutenticacaoIT, EstabelecimentoIT e
NextFlowApplicationIT) falharam por acesso negado ao pipe Docker, nao por uma
asserção de negocio. Nao foram ignoradas nem consideradas aprovadas.

## Cobertura nova

- HTTP: tentativas de forjar identidade, consultar/listar empresas alheias,
  alterar nome/dados de outro usuario e gravar sem CSRF valido.
- HTTP/servico: formatos e limites de entrada, preservacao de registros apos
  operacoes negadas (a parte PostgreSQL ainda aguarda execucao).
- Frontend: atividades, CEP, telefone, todas as UFs, limites de endereco,
  numero/sem numero e exclusao de propriedades fora do contrato.
- Cliente HTTP: CSRF recusado, sessao expirada, acesso negado, erro de servidor,
  falha de rede, cancelamento, paginacao incompleta e ausencia de repeticao de escrita.

## Pendencias para encerrar a validacao

Em um terminal com acesso ao Docker e permissao para os subprocessos do Vite:

```powershell
cd C:\NextFlow
.\mvnw.cmd verify
npm test --prefix frontend
npm run build --prefix frontend
```

Os testes de integracao usam PostgreSQL temporario do Testcontainers. Nao apontam
para o banco real nem para seu volume. Nao iniciar testes com credenciais reais.
Ainda falta verificacao visual no navegador: salvar/recarregar, trocar empresas,
repetir carga com falha e conferir o fluxo numero/sem numero.

Nao ha aprovacao de persistencia, cookies reais ou interface visual com base
somente nos testes com mocks. O trabalho nao esta com todas as verificacoes verdes.

