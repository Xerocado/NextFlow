# Texto para retomar o NextFlow em outro chat

Atualizado em 21/10/2026.

Copie o texto abaixo para um novo chat aberto na pasta C:\NextFlow:

```text
Vamos continuar o NextFlow em C:\NextFlow.
Antes de alterar arquivos, leia AGENTS.md, README.md, docs/estado-atual.md,
frontend/README.md e os contratos dos modulos afetados. Inspecione o codigo
atual e confira o Git; a ultima verificacao nao reconheceu um repositorio.

O objetivo e um SaaS de gestao operacional e financeira por segmento.
O primeiro fluxo e entrega de agua por caminhao-pipa. Barbearia e uma
expansao planejada, ainda sem modulo. A atividade atual servicos/produtos/ambos
nao implementa adaptacao de telas por segmento.

Implementado: autenticacao, recuperacao SMTP, empresas, clientes, gastos,
entregas, pagamentos parciais, historico, pendencias e movimento diario.
Migracoes ate V7. Relatorios ainda mostram Em desenvolvimento.
Nao reative demonstracoes. Confirme tudo no codigo antes de editar.

Aprovado para proximos incrementos: funcionarios sem login; caminhoes;
uma equipe por caminhao/dia com motorista e ajudante opcional; entregas e
gastos podem ficar sem veiculo. Pagamentos tardios devem permanecer associados
a entrega/caminhao de origem e aparecer na data efetiva do recebimento.
A politica de exclusao/arquivamento de empresas ainda precisa de definicao.

Identificadores tecnicos usam nextflow. O banco padrao para novas instalacoes
e nextflow. No ambiente existente, preserve DB_NAME do .env: mudar o padrao
nao renomeia o banco. Nao renomeie banco/container nem recrie volumes.
O container desejado e nextFlow-db; confira o nome atual antes de agir.
Credenciais existem somente no ambiente/.env local: nao exiba valores.
A recuperacao por Gmail foi confirmada manualmente em sessao anterior.

Siga AGENTS.md atualizado. Preserve o layout e trabalho de outros agentes.
Trabalhe em etapas pequenas, explique para iniciante e atualize documentacao.
O mantenedor quer executar os primeiros comandos Git/GitHub para aprender;
nao inicialize Git, faca stage, commit, configure remoto ou push por ele.

Ultimos resultados registrados em 21/10: 71 testes Java e 62 frontend
passaram; TypeScript passou. Integracao PostgreSQL bloqueada por acesso
negado ao Docker, antes dos cenarios. Build Vite bloqueado por spawn EPERM.
Revisao visual e navegacao completa ainda pendentes. Nao apresente resultados
historicos como testes executados no novo chat.

Primeiro resuma o estado encontrado e apresente plano curto com arquivos,
riscos e validacao. Resolva escolhas tecnicas rotineiras e confirme regras
financeiras ou operacoes que afetem os dados antes de implementa-las.
```

Esta passagem de contexto nao contem senhas. Confira processos e configuracao
antes de iniciar novas instancias. Veja docs/estado-atual.md para limitacoes.
