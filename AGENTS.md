# AGENTS.md — NextFlow

## Objetivo do produto

Evoluir o NextFlow para um SaaS de gestão operacional e financeira para pequenos negócios, autônomos e prestadores de serviços. A empresa será o contexto dos dados e seu segmento orientará os campos, telas e fluxos disponíveis.

O primeiro caso de uso é a operação de entregas de água por caminhão-pipa. Ele orienta o módulo inicial, mas não define todo o produto. Barbearia é um exemplo de expansão futura, não uma funcionalidade existente nem um conjunto de regras já aprovado.

Mantenha uma base compartilhada de identidade, empresas, clientes, equipe e financeiro; recursos específicos, como caminhões e litros, pertencem ao fluxo do segmento. Evolua por incrementos, sem criar uma plataforma genérica de plugins, microsserviços ou infraestrutura sem necessidade comprovada.

Este documento substitui as instruções antigas deste arquivo. Diferencie sempre código existente, decisões aprovadas e propostas ainda pendentes.

## Descoberta e estado real

- Caminho atual: `C:\NextFlow`, renomeado de `C:\NexFlow`. Confirme a pasta antes de trabalhar; use caminhos relativos quando possível.
- Antes de editar, leia `README.md`, as atualizações recentes de `docs/estado-atual.md`, `frontend/README.md` e os contratos do módulo afetado.
- Inspecione código, dependências, configurações e `git status`. Nesta cópia, Git ainda não foi inicializado; confirme novamente, pois o mantenedor pretende publicá-la.
- Backend existente: Java 21, Spring Boot 4.1.1, Maven Wrapper, Spring Security, JPA, Bean Validation, SMTP e Flyway. Flyway já foi escolhido; migrações existentes vão de V1 a V7.
- Frontend existente: React, TypeScript, Vite e CSS próprio com temas claro/escuro.
- Implementado: autenticação/recuperação, empresas, clientes, gastos, entregas, pagamentos, histórico, pendências e movimento diário. Relatórios ainda mostram “Em desenvolvimento”.
- Atividade da empresa hoje é `servicos`, `produtos` ou `ambos`; não representa a seleção por segmento planejada. Não apresente adaptação por barbearia/caminhão-pipa como entregue.
- Não existem cadastros de funcionários/caminhões, equipes diárias, exclusão/arquivamento de empresas ou login de funcionários.
- Não há bot Python/Telegram/Google Sheets nesta pasta. Não invente integração ou migração desse bot.
- Não há Dockerfile, Compose, CI/CD ou Swagger/OpenAPI configurados nesta cópia. Não documente arquivos ou comandos de automação inexistentes.
- Resultados anteriores de testes estão na documentação. Integração PostgreSQL e build Vite tiveram bloqueios de ambiente; não os trate como aprovados.

## Regras financeiras aprovadas

- Cada entrega registra data, cliente, litros inteiros positivos e valor total informado pelo usuário. Não calcular preço por litro automaticamente: o total pode refletir descontos.
- Cliente pode ser cadastrado ou avulso; a identificação do avulso é opcional. Ambos admitem pagamento integral, parcial, pendente/fiado ou sem cobrança.
- Sem cobrança não gera dívida e admite motivo opcional.
- Pagamentos posteriores reduzem o saldo preservando cada recebimento e sua data efetiva. Recebimento retroativo entra no movimento da data em que o dinheiro foi recebido, independentemente da data da entrega.
- Pagamentos não podem exceder o saldo nem gerar crédito. O código atual rejeita pagamentos com data futura.
- Entregas e pagamentos são operações separadas no contrato atual. Uma falha de resposta não comprova que a escrita falhou; não repetir POST automaticamente.
- Diesel, compra de água e outros gastos são lançamentos separados e variáveis, usando o módulo existente, sem recorrência automática.
- Movimento diário reúne entregas, recebimentos e gastos. Recebido menos gasto é saldo do dia; não rotular como lucro ou saldo acumulado.
- Valores em BRL, até 12 dígitos inteiros e duas casas decimais, sem arredondamento automático. Use `BigDecimal` no backend e evite cálculos monetários com ponto flutuante no frontend.
- Datas de negócio são datas locais; o frontend usa `America/Sao_Paulo`. Instantes de criação são registrados em UTC.
- Correções, cancelamentos, estornos, crédito e mudanças de moeda exigem regras explícitas antes de implementação.

## Equipe, veículos e segmentos — aprovados, ainda não implementados

- Funcionários serão cadastros operacionais, sem login nesta etapa. Não confunda funcionário com usuário autenticado, nem crie credenciais/convites por inferência.
- A empresa pode operar vários caminhões por dia. Cada caminhão terá uma única composição de equipe naquele dia: motorista e ajudante opcional. Não limitar a empresa inteira a um caminhão por dia.
- Entregas e gastos podem ser vinculados ao caminhão; registros sem veículo são permitidos. Gastos gerais permanecem possíveis.
- Preserve caminhão e equipe históricos. Alterações futuras de cadastro não devem reinterpretar quem realizou uma entrega anterior. Não atribua veículos/equipes fictícios aos dados existentes.
- Recebimentos posteriores permanecem associados à entrega e ao caminhão de origem. Essa associação não informa quem recebeu o dinheiro; controle de caixa, recebedor e formas de pagamento ainda precisam de definição.
- A escolha do segmento da empresa deverá orientar seus recursos. A seleção por segmento e a troca de segmento com dados existentes exigem um contrato e migrações próprios.
- Para o próximo incremento, proponha arquivos, riscos, testes e preservação de dados antes de modificar o esquema. Não implemente barbearia, assinaturas ou cobrança do SaaS junto do módulo de caminhões.

## Decisões ainda pendentes

- O usuário pediu remoção de empresas. A proposta de excluir apenas empresas vazias e arquivar aquelas com histórico ainda não foi aprovada. Não apagar dados nem assumir exclusão em cascata.
- Desativação de funcionários/veículos, permissões com login, registro de quem recebeu, troca de segmento, correções e estornos precisam de definição quando entrarem no escopo.
- A revisão identificou pendências inicialmente limitadas ao mês atual e ausência de idempotência no servidor. Trate como melhorias a planejar, sem afirmar que já foram corrigidas.
- Não escolha licença, preços, planos de assinatura ou regras de acesso de funcionários sem instrução do mantenedor.

## Arquitetura e implementação

- Preserve a organização por domínio: `autenticacao`, `usuario`, `estabelecimento`, `cliente`, `entrega`, `gasto` e `movimento`.
- Controllers cuidam de HTTP; serviços concentram autorização, regras e transações; repositories consultam a persistência. Exponha DTOs, não entidades JPA.
- Serviços de negócio devem poder atender a interface e futuras integrações. WhatsApp está planejado; não implemente agora nem acople domínio a uma biblioteca específica. Baileys não é dependência obrigatória.
- Use injeção por construtor, validação no servidor e respostas HTTP consistentes, sem stack traces ou dados sensíveis.
- Preserve o layout atual do frontend. Reutilize estilos/componentes, mantenha estados de carregamento/erro/vazio, paginação e cancelamento de consultas ao trocar empresa ou período. Não reative dados de demonstração.
- Não altere migrações já aplicadas para evoluir o esquema. Adicione a próxima versão Flyway; não use Hibernate para alterar tabelas nem habilite baseline/clean para contornar erros.
- Não acrescente dependências, padrões complexos, filas ou serviços sem benefício concreto para a entrega.

## Segurança e isolamento por empresa

- A identidade vem da sessão autenticada, nunca de `usuarioId` enviado pelo cliente. Login usa sessão/cookie e CSRF; não substituir por JWT sem necessidade e aprovação de escopo.
- Toda leitura/escrita deve autorizar o vínculo com a empresa no servidor, incluindo totais, relatórios, detalhes e futuras exportações.
- Hoje escritas exigem `PROPRIETARIO`. Novos papéis exigem uma política de permissão explícita e migração; não libere escrita apenas porque o usuário tem algum vínculo.
- Combine o ID do registro com a empresa autorizada, inclusive entre duas empresas do mesmo proprietário. Preserve as restrições compostas existentes no banco.
- Atualização de saldo e criação de pagamento devem ocorrer na mesma transação. Preserve a proteção concorrente contra recebimentos acima do saldo.
- Não confunda trava de concorrência com idempotência: um reenvio pode duplicar um pagamento parcial mesmo com bloqueio de linha.
- Nunca exiba ou versione `.env`, credenciais SMTP/banco, tokens, códigos de recuperação, dados pessoais/financeiros reais ou backups. Leia somente exemplos sem segredos quando possível.
- Não faça deploy público, envio real de mensagens ou chamadas externas com efeitos colaterais sem autorização explícita.

## Ambiente e validação

- Alvo principal: Windows/PowerShell, notebook com 8 GB e IDE/JDK. Prefira Spring Boot direto no JDK; PostgreSQL pode usar o Docker existente.
- API local: `http://localhost:8080`; frontend: `http://localhost:5173`. Use `localhost` consistentemente para cookies.
- `iniciar-dev.ps1` carrega `.env`; Spring Boot sozinho não faz isso. Na IDE, configurar variáveis de execução. O padrão para novos bancos é `DB_NAME=nextflow`; ambientes existentes podem usar outro nome explícito. Não alterar `.env`, renomear banco/container ou migrar dados automaticamente para acompanhar esse padrão.
- Não torne Docker obrigatório para compilar/testar código que não depende dele. Testcontainers requer Docker e cria PostgreSQL temporário; não use dados de produção ou o volume local nos testes.
- Verificações usuais: `.\mvnw.cmd test`, `.\mvnw.cmd verify`, `npm test --prefix frontend` e `npm run build --prefix frontend`.
- Para mudança funcional, acrescente testes proporcionais ao risco, priorizando dinheiro, validação, isolamento e concorrência. Execute verificações específicas primeiro e depois a suíte relevante.
- Informe comandos, resultados e limites. Nunca afirme sucesso se o comando não foi executado ou foi bloqueado. Testes com mocks não comprovam banco, layout ou navegação real.
- Não instale ferramentas globalmente, altere WSL/Windows/serviços ou execute comandos administrativos sem autorização. Não use prune, apague volumes ou recrie banco para resolver falhas.

## Fluxo de trabalho e aprendizado do mantenedor

1. Inspecione e resuma o que existe. Apresente plano curto com arquivos, riscos e validação para mudanças relevantes.
2. Faça incrementos pequenos e revisáveis. Resolva escolhas técnicas rotineiras; pergunte sobre regras que alterem dados, permissões ou comportamento financeiro.
3. Explique decisões em português brasileiro, de forma acessível. O mantenedor usa o projeto para aprender; relacione o código a exemplos concretos quando solicitado.
4. Atualize README e documentação pertinente a cada entrega, respeitando o escopo de arquivos autorizado. Registre claramente o que é plano e o que foi implementado.
5. Preserve trabalho de outros agentes/chats. Use skills pertinentes. Quando houver delegação autorizada, divida a responsabilidade por arquivos e combine contratos antes de editar em paralelo.
6. Termine com arquivos alterados, validações executadas, limitações e próximos passos.

O mantenedor quer executar pessoalmente os primeiros comandos Git/GitHub para aprender. Oriente e explique; não inicialize Git, faça stage, commit, configure remoto ou push por conta própria. Preserve alterações locais e não use comandos destrutivos como `git reset --hard`, `git clean -fd` ou `git push --force` sem autorização explícita.

