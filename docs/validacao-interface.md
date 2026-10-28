# Validação isolada da interface

Execução em 27/10/2026: **18 cenários aprovados**, usando Playwright 1.57.0 e
Microsoft Edge 156.0.4314.42 em modo headless, com backend real e PostgreSQL
16.15 descartável. A ferramenta de controle nativo estava indisponível; o
mantenedor autorizou o uso direto do Playwright já instalado.

Repetido em 28/10/2026: **18 cenários aprovados**, Edge 156.0.4314.50,
PostgreSQL 16.15 descartável e Mailpit local. Artefatos em
`.cache/navegacao-1793187917122/`.

## Como reproduzir

Requer JDK 21, Node 24+, Docker acessível, dependências do projeto e as imagens
`postgres:16-alpine` e `axllent/mailpit:v1.27.4` já disponíveis. Também requer
Playwright já instalado e Edge disponível; o roteiro não instala pacotes,
baixa navegadores ou faz pull de imagens. Docker é requisito deste roteiro,
não dos testes rápidos da aplicação.

Na raiz do projeto, com as portas 18080 e 15173 livres:

```powershell
# Gera o JAR com o código atual; não inicia a API nem aplica migrações.
.\mvnw.cmd -o '-DskipTests' package
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar o JAR' }

# Opcional: informe o diretório de um Playwright já instalado fora do frontend.
# $env:PLAYWRIGHT_PACKAGE = 'C:\caminho\para\node_modules\playwright'

node scripts/validar-interface.mjs
```

O pacote é procurado a partir de `frontend/package.json` ou no caminho absoluto
informado em `PLAYWRIGHT_PACKAGE`. `PLAYWRIGHT_CHANNEL` permite selecionar outro
canal já instalado; o padrão é `msedge`. Nesta entrega foi usado o pacote do
runtime local do Codex, sem adicioná-lo ao manifest/lockfile do projeto.
Uma instalação futura e o versionamento dessa dependência de testes devem ser
decididos explicitamente; não estão embutidos no comando.

`-o` usa o cache Maven existente. Antes de executar o roteiro, gere novamente o
JAR sempre que alterar o backend. O teste usa os fontes frontend pelo Vite;
o build de produção é uma verificação separada:

```powershell
npm test --prefix frontend
npm run build --prefix frontend
```

## Isolamento e encerramento

O roteiro inicia seu próprio ambiente e não aceita URL de banco fornecida pelo
usuário. PostgreSQL usa `tmpfs` em `/var/lib/postgresql/data`, banco
`nextflow_validacao`, credencial aleatória em memória e porta dinâmica publicada
somente em 127.0.0.1. Antes de iniciar Java, verifica a configuração de `tmpfs`
e a ausência de montagens de volume. Flyway aplica V1–V7 apenas nesse banco.

Mailpit é criado sem relay/forwarding, com portas locais dinâmicas. A API recebe
esse SMTP e não herda variáveis DB_*, SMTP_* ou SPRING_* do terminal. O `.env`
da raiz não é carregado. As requisições externas do navegador, incluindo Google
Fonts e ViaCEP, são bloqueadas. Cada execução usa contexto de navegador novo,
sem cookies do navegador pessoal.

API: `http://localhost:18080`; frontend: `http://localhost:15173`.
O roteiro recusa portas ocupadas e não encerra processos preexistentes.
Ao terminar, inclusive em falha, fecha o navegador e encerra seus próprios
processos/containers. Os containers usam `--rm`; não há prune, remoção de
volumes ou intervenção no PostgreSQL operacional. Ctrl+C também aciona a limpeza;
uma interrupção forçada do processo ou queda da máquina pode exigir conferir
os IDs próprios registrados em `ambiente.json`.

## Cobertura executada

- Cadastro e login pela interface; cookie HttpOnly/SameSite=Lax; POST sem CSRF rejeitado.
- Duas empresas do mesmo dono e clientes separados; seleção pela interface.
- Entrega cadastrada de R$ 150,30; pagamento de R$ 50,10 ontem e R$ 100,20 hoje;
  rejeição de excesso/data futura na interface e no servidor; quitação.
- Entrega sem cobrança e avulso não identificado com saldo pendente.
- Gastos pela interface e massa adicional pela API: 22 registros, total de
  R$ 25,50 preservado na segunda página. Movimento mostra R$ 100,20 recebidos e
  saldo de R$ 74,70 hoje; R$ 50,10 recebidos ontem, sem deslocar a entrega antiga.
  Paginar os gastos no Movimento enviou somente o GET de gastos; o resumo e as
  outras listas não foram consultados novamente.
- Isolamento por HTTP entre usuários e entre empresas do mesmo proprietário.
- Link de salto acionado por teclado: foco real no main e hash preservado.
- Relatórios com aviso de desenvolvimento e tema escuro no movimento.
- GETs reais retidos pelo Playwright até trocar de empresa: clientes, entregas,
  gastos e movimento não reapresentam a resposta da empresa anterior.
- Sete seções e menu nas larguras de 390 e 360 px; empresa ativa visível,
  ausência de overflow da página e rolagem horizontal de tabela por teclado.
- Uma solicitação de recuperação capturada no Mailpit local, sem expor o código.
- Sessão invalidada no servidor por logout, com a interface antiga ainda aberta:
  tentativa de escrita recebe 401, leva ao login e não é repetida ao reautenticar.
- Logout pelo botão da interface; perfil passa a retornar 401; nenhuma exceção
  JavaScript observada no roteiro.

Os 18 cenários agrupam essas verificações; não equivalem a 18 testes JUnit.
Os dados principais foram criados por formulários reais. HTTP foi usado para
preparar a massa de paginação, provocar invalidação e conferir respostas negadas.

## Defeitos corrigidos e evidências

A primeira execução completa aprovou 12 de 16 cenários. Falharam a visibilidade
da empresa em duas larguras, o retorno ao login após sessão invalidada e a
captura SMTP. Os dois defeitos de interface foram corrigidos em Workspace/estilos
e App/clientes HTTP. `api/sessao.ts` notifica o primeiro 401 e distingue a geração
do login, evitando que respostas atrasadas encerrem uma sessão nova. Não repete
requisições e não trata 403 ou senha incorreta como sessão expirada.

O Mailpit registrou falha de conexão no primeiro ensaio; a captura passou após
usar `--smtp-disable-rdns` no receptor descartável. Isso não alterou timeouts ou
SMTP da aplicação. Não foi realizada análise completa da causa de rede/DNS.

Resultado final: 18/18 cenários; 68/68 testes frontend (cinco novos de sessão);
TypeScript e Vite aprovados. Bundle JS 295,65 kB (gzip 87,44 kB), CSS 19,48 kB
(gzip 4,61 kB). Backend empacotado com `-DskipTests`; a suíte Java não foi
reexecutada neste incremento, pois seus fontes e migrações não mudaram.

Artefatos finais locais: `.cache/navegacao-1793105690092/` com `cenarios.json`,
`resultado.json`, `ambiente.json`, logs e capturas desktop claro/escuro e mobile.
Logs de comandos: `.cache/navegacao-package.log`, `.cache/navegacao-unitarios.log`,
`.cache/navegacao-build.log` e `.cache/navegacao-final.log`. Esses arquivos são
ignorados pelo Git e contêm somente dados fictícios, sem persistir cookies,
tokens CSRF, código de recuperação ou senha do banco.

## Alcance e próximos passos

As capturas foram revisadas visualmente. A navegação usa um navegador real com
viewport desktop 1440×1000 e larguras responsivas 390/360; não comprova operação
em aparelho físico, Safari/Firefox, leitor de tela ou todas as combinações de
resolução. A invalidação de sessão foi provocada por logout; não se aguardou o
timeout de 30 minutos. O fluxo completo de redefinição de senha não foi repetido
no navegador. O roteiro não valida implantação de produção nem indisponibilidade
ou resposta perdida em escritas.

Próximo incremento recomendado: contrato de idempotência para entregas,
pagamentos e gastos. Dívidas antigas, paginação independente no movimento,
recuperação durável e preparação operacional continuam pendentes.
