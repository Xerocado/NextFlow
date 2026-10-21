# Cadastro, login e recuperação de senha

A API atende a interface React em frontend/. Usuario e a identidade de quem entra; estabelecimentos possuem vinculos e autorizacao por proprietario.

## Como o código funciona

- `Usuario` é uma entidade JPA: Hibernate a relaciona à tabela `usuarios`.
- `UsuarioRepository` consulta o banco; o e-mail é normalizado para minúsculas e
  possui restrição de unicidade no PostgreSQL, inclusive contra cadastros concorrentes.
- `CadastroService` aplica a política de senha e grava um hash BCrypt com custo 12.
  A senha exige ao menos 12 caracteres e no máximo 72 bytes UTF-8. Não é truncada.
- `SegurancaConfig` conecta o Spring Security ao usuário persistido. Login utiliza
  o filtro padrão de autenticação; a aplicação não compara senhas manualmente.
- DTOs limitam campos de entrada e saída. Entidades e hashes não são respostas da API.
- `@Transactional` faz consumo do token e troca de senha acontecerem juntos.
- `EmailRecuperacao` é uma interface: testes substituem SMTP por um objeto falso.

## Contrato HTTP

| Método e caminho | Entrada | Resultado esperado |
|---|---|---|
| GET `/api/auth/csrf` | Sem corpo | 200, token CSRF e nome do header |
| POST `/api/auth/cadastro` | JSON: `nome`, `email`, `senha` | 201 |
| POST `/api/auth/login` | Formulário: `email`, `password` | 204 e sessão; 401 se inválido |
| GET `/api/auth/me` | Cookie da sessão | 200: `id`, `email`; 401 se anônimo |
| POST `/api/auth/logout` | Cookie e CSRF | 204, invalida sessão |
| POST `/api/auth/recuperar-senha` | JSON: `email` | 202, mensagem genérica |
| POST `/api/auth/redefinir-senha` | JSON: `email`, `token` (texto com 6 numeros), `novaSenha` | 204, 400 ou 422 |

Todos os POSTs exigem CSRF, inclusive login, cadastro e recuperação. Primeiro faça
GET `/api/auth/csrf`, preserve o cookie e envie o token no header informado.
Depois de login/logout, obtenha um novo token CSRF. Não habilite CORS amplo ou
desabilite CSRF para contornar erros de cliente.

Dados inválidos retornam 400; conflitos de cadastro retornam 409 com mensagem
genérica; limite de tentativas retorna 429; acesso negado retorna 403.
O conflito 409 no cadastro permite inferir que um e-mail já está registrado;
a resposta uniforme contra enumeração se aplica especificamente à recuperação.
Não há login automático após cadastro ou redefinição.

## SMTP local de testes

Mailpit recebe as mensagens localmente e permite lê-las no navegador. É opcional
para iniciar a API e executar testes; é necessário para observar o e-mail no teste
manual de recuperação. Não há envio para caixas reais na configuração padrão.

Se desejar usar Docker, execute no seu PowerShell:

```powershell
docker run -d --rm --name nextflow-mail -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit:v1.27.4
```

O nome nextflow-mail vale para um novo container opcional; se ja existe um Mailpit com outro nome, continue usando-o sem recriar ou renomear.

Esse container adicional é apenas uma caixa de e-mail de desenvolvimento, sem
volume e sem relação com o container PostgreSQL. As mensagens são descartáveis.
Abra `http://localhost:8025`. SMTP usa `localhost:1025`, sem autenticação/TLS local.
Não configure encaminhamento para e-mail real. Imagem e portas seguem a
[documentação do Mailpit](https://mailpit.axllent.org/docs/install/docker/).

Variáveis opcionais: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_AUTH`, `SMTP_STARTTLS`, `SMTP_FROM`. Não grave credenciais em arquivos versionados.

## Teste manual em outro PowerShell

Inicie a API com as credenciais PostgreSQL conforme o README. Em outra janela:

```powershell
$base = 'http://localhost:8080'
$csrf = Invoke-RestMethod "$base/api/auth/csrf" -SessionVariable sessao
$headers = @{ $csrf.headerName = $csrf.token }
$credencial = Get-Credential -Message 'E-mail e senha do usuário de teste'
$email = $credencial.UserName
$senha = $credencial.GetNetworkCredential().Password

$cadastro = @{ nome = 'Pessoa de teste'; email = $email; senha = $senha } | ConvertTo-Json
Invoke-RestMethod "$base/api/auth/cadastro" -Method Post -WebSession $sessao -Headers $headers -ContentType 'application/json' -Body $cadastro

Invoke-RestMethod "$base/api/auth/login" -Method Post -WebSession $sessao -Headers $headers -ContentType 'application/x-www-form-urlencoded' -Body @{ email = $email; password = $senha }
$senha = $null
$cadastro = $null
$credencial = $null
Invoke-RestMethod "$base/api/auth/me" -WebSession $sessao

$csrf = Invoke-RestMethod "$base/api/auth/csrf" -WebSession $sessao
$headers = @{ $csrf.headerName = $csrf.token }
Invoke-RestMethod "$base/api/auth/recuperar-senha" -Method Post -WebSession $sessao -Headers $headers -ContentType 'application/json' -Body (@{ email = $email } | ConvertTo-Json)
```

Use dados fictícios. Abra Mailpit e copie o código recebido. Não compartilhe o código
em chats ou capturas. A mensagem contém o código, sem link para uma tela inexistente.
Para usá-lo sem colocá-lo literalmente no histórico:

```powershell
$codigoSeguro = Read-Host 'Código de recuperação' -AsSecureString
$codigo = [System.Net.NetworkCredential]::new('', $codigoSeguro).Password
$novaCredencial = Get-Credential -UserName $email -Message 'Nova senha de teste'
$redefinicao = @{ email = $email; token = $codigo; novaSenha = $novaCredencial.GetNetworkCredential().Password } | ConvertTo-Json
Invoke-RestMethod "$base/api/auth/redefinir-senha" -Method Post -WebSession $sessao -Headers $headers -ContentType 'application/json' -Body $redefinicao
$codigo = $null
$codigoSeguro = $null
$novaCredencial = $null
$redefinicao = $null
```

O próximo acesso autenticado com a sessão antiga retorna 401. Para entrar de novo,
obtenha novo CSRF e faça login com a nova senha. A senha antiga e o código usado
não devem funcionar. Não é possível recuperar a senha original, somente substituí-la.

## Proteções e limites

A nova senha deve ser diferente da atual. A comparacao usa PasswordEncoder.matches
com o hash armazenado, somente depois de verificar o codigo de recuperacao.
Senha igual retorna HTTP 422 com mensagem especifica. Nao altera a senha,
nao invalida as sessoes e nao consome o codigo: escolha outra senha dentro
do prazo original de 10 minutos. Codigo invalido, expirado ou bloqueado continua HTTP 400.

## Entrega de email real

O destinatario ja e o email cadastrado no usuario. O Mailpit local apenas
captura mensagens para testes; localhost:8025/view/... e a visualizacao
da mensagem, nao o destinatario. Enderecos example.test nao recebem email real.

Para entrega real, configure no ambiente do processo Java os valores do provedor:
SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, SMTP_AUTH e
SMTP_STARTTLS. Use remetente permitido pelo provedor e um destinatario real
cadastrado. As opcoes atuais atendem SMTP com STARTTLS; portas e mecanismo
dependem do provedor escolhido. Nao desative TLS em um envio real.
Nunca coloque senha SMTP no Git, no frontend ou em variaveis VITE_*.
Nao existe necessidade de alterar o banco ou excluir o Mailpit.
O envio externo depende da configuracao de credenciais no ambiente local.

### Gmail para desenvolvimento

Ative a verificacao em duas etapas e crie uma senha de app para NextFlow em
https://myaccount.google.com/apppasswords . Se a opcao nao estiver disponivel,
consulte as restricoes da sua conta Google; nao use a senha normal no SMTP.

No mesmo PowerShell que inicia o Spring Boot, mantenha as variaveis DB_*
ja configuradas e execute:

```powershell
$env:SMTP_HOST = 'smtp.gmail.com'
$env:SMTP_PORT = '587'
$env:SMTP_AUTH = 'true'
$env:SMTP_STARTTLS = 'true'
$env:SMTP_USERNAME = Read-Host 'Gmail que enviara os emails do NextFlow'
$env:SMTP_FROM = $env:SMTP_USERNAME
$smtpSegredo = Read-Host 'Senha de app do Google (sem os espacos de exibicao)' -AsSecureString
try {
    $env:SMTP_PASSWORD = [System.Net.NetworkCredential]::new('', $smtpSegredo).Password
    .\mvnw.cmd spring-boot:run
} finally {
    Remove-Item Env:SMTP_PASSWORD -ErrorAction SilentlyContinue
    $smtpSegredo = $null
}
```

Pare a instancia anterior do Spring antes de iniciar outra. O prompt de senha
deve ser preenchido interativamente: nao coloque o segredo no historico ou chat.
Esse Gmail e o remetente da aplicacao; o destinatario continua sendo o email
da conta NextFlow que solicitou recuperacao. Nao e necessario que cada usuario
configure SMTP. Teste com um email real seu cadastrado; confira spam. O Mailpit
continua disponivel para testes, mas nao recebe mensagens desta configuracao.
Se falhar envio, solicite outro codigo depois de corrigir a configuracao.

Referencias oficiais: [senhas de app](https://support.google.com/accounts/answer/185833?hl=pt-BR)
e [SMTP Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp).

## Tokens e sessoes

O codigo possui 6 numeros, gerados por SecureRandom, com zeros iniciais preservados,
prazo de 10 minutos e uso unico. Somente seu hash BCrypt (custo 12) fica no banco;
o codigo nunca e procurado globalmente: a busca e pelo usuario do email informado.
Nova solicitacao substitui o codigo anterior e zera o contador. Cinco erros de
codigo invalidam seu uso, sem bloquear o login. O contador e persistido no banco,
inclusive quando a API responde com erro; essa excecao especifica nao desfaz a
transacao. Um bloqueio de linha do usuario serializa consumo, reemissao e erros
concorrentes. Senha igual a atual so e identificada apos conferir o codigo correto.
A senha e o codigo nao sao registrados em logs.

A migracao V3 adiciona o contador, garante um codigo por usuario e expira os
tokens do contrato antigo. Clientes da API devem enviar email junto de token
e novaSenha. E necessario solicitar um novo codigo depois da atualizacao.
O email usa multipart HTML/texto, sem imagens ou fontes externas. O modelo esta
em src/main/resources/templates/email/recuperacao-senha.html; somente os seis
numeros validados sao interpolados no HTML. A configuracao SMTP nao muda.

A versão de credencial aumenta na redefinição. Um filtro compara a versão atual
do banco com a da sessão em cada requisição autenticada, invalidando sessões
antigas. O identificador de sessão também é renovado no login pelo Spring Security.

O pedido de recuperação é processado por uma fila em memória com um trabalhador
e até 32 tarefas esperando. Conta existente e desconhecida recebem o mesmo 202
sem aguardar SMTP. A resposta não garante entrega. Falha de SMTP gera aviso genérico
interno e desfaz a criação do token; solicite novamente após corrigir o SMTP.
O SMTP é chamado dentro da transação com timeouts curtos. Uma falha de commit
após aceitação SMTP pode entregar um código que não ficou válido no banco;
nesse caso solicite outro. Uma entrega durável será uma evolução posterior.
Reiniciar a aplicação perde tarefas ainda não processadas.

O aviso do RecuperacaoDispatcher inclui somente uma categoria segura:
`SMTP_AUTENTICACAO` (autenticacao recusada), `SMTP_CONEXAO` (rede, TLS ou timeout),
`SMTP_ENVIO` (outra falha de email) ou `PROCESSAMENTO_INTERNO` (demais falhas).
Ela ajuda a direcionar o diagnostico, sem afirmar a causa exata. O classificador
inspeciona tipos de excecao, sem registrar mensagens, destinatarios, conteudo,
credenciais, codigos ou stack trace. A resposta publica continua generica.

Limites por janela de 15 minutos: 20 POSTs por IP/caminho de autenticação;
10 tentativas de login por e-mail; 3 recuperações por e-mail. O armazenamento do
limitador é limitado a 5000 chaves. IP é o da conexão direta, sem confiar em headers
enviados pelo cliente. Os limites são locais ao processo e reiniciam com a aplicação.
Antes de múltiplas instâncias, precisamos de uma estratégia compartilhada.

Sessões expiram após 30 minutos de inatividade. Cookie usa HttpOnly e SameSite=Lax.
`SESSION_COOKIE_SECURE=false` atende apenas HTTP local; em produção requer HTTPS
e `SESSION_COOKIE_SECURE=true`. Não há JWT nesta etapa.

Esta é uma fundação local, sem verificação de e-mail, recuperação durável de tarefas,
monitoramento de entrega ou configuração pública de produção. Antes de disponibilizar
cadastro público, planejar verificação de e-mail e recuperação operacional.

## Validação automatizada

`test` executa testes unitários sem Docker. `verify` também executa integração com
PostgreSQL temporário, migrações Flyway, cadastro, login, CSRF, logout, recuperação,
expiração, reutilização, concorrência e revogação de sessão. O envio é substituído
por um fake/mock, sem chamar SMTP real. O teste de contexto original foi preservado.

Referências: [Spring Security](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/dao-authentication-provider.html)
e [OWASP — recuperação de senha](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).


