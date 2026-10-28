# Entregas e pagamentos — primeiro incremento

API implementada em `com.nextflow.entrega`, com migracoes V7 e V8. A interface possui
Historico e Pendencias integrados pelo agente anterior e Movimento do dia
adicionado nesta etapa, preservando os componentes e estilos existentes.

Base: `/api/estabelecimentos/{empresaId}/entregas`.

- POST base: `data`, `clienteId` opcional, `identificacaoAvulso` opcional,
  `litros` inteiro positivo, `valorTotal` manual em BRL, `semCobranca` e `motivo`
  opcional. Nao informar identificacao avulsa junto de cliente cadastrado.
- POST `/{id}/pagamentos`: `data` efetiva e `valor` positivo. Pagamentos sao
  individuais e preservados. Nao aceita data futura ou valor acima do saldo.
- GET `/{id}`: entrega e lista de pagamentos em ordem cronologica.
- GET base: `inicio`, `fim`, `pendentes=false`, `pagina=0`, `tamanho=20`.
  Periodo obrigatorio; tamanho de 1 a 100. Pendentes filtra saldo maior que zero.

Entrega nasce pendente; pagamentos integrais ou parciais sao registrados pelo
endpoint de pagamentos. Sem cobranca permite valor zero e sempre tem saldo zero.
Valor monetario tem ate 12 digitos inteiros e duas casas, sem arredondamento.
Nome do cliente e copiado para preservar a identificacao historica.

Todas as operacoes autorizam a empresa no servidor. Cliente e entrega sao
consultados junto da empresa. Escritas exigem proprietario e CSRF. Recebimentos
bloqueiam a linha da entrega durante a transacao para impedir excesso concorrente.
V7 adiciona chaves compostas para isolamento tambem no banco, sem apagar dados.

## Reenvios de escrita

As criações de entrega, pagamento e gasto aceitam o header opcional
`Idempotency-Key` como UUID. A interface envia uma chave estável para a mesma
operação enquanto aguarda uma resposta. Se a primeira resposta se perder, repetir
com a mesma chave e o mesmo conteúdo retorna o recurso original (HTTP 201); usar
a chave com outro conteúdo ou outra entrega de destino retorna HTTP 409. Escopo:
empresa + operação + chave. Em pagamento, a entrega de destino integra o conteúdo
protegido. Clientes antigos podem omitir o header e mantêm o comportamento anterior,
sem proteção contra duplicação.

A V8 grava na mesma transação do lançamento apenas empresa, operação, UUID da
chave, SHA-256 do conteúdo e ID do resultado. Não armazena payload. Linhas são
retidas permanentemente, como decidido pelo mantenedor; não há limpeza automática.
Falha/rollback remove tanto o registro da chave quanto o lançamento. A restrição
única e a transação protegem requisições simultâneas; no pagamento, permanece também
a trava da entrega e a validação do saldo.

No frontend, `sessionStorage` guarda apenas a chave e o hash do conteúdo para
reutilizar após recarregar a página. O corpo não fica armazenado. Depois de uma
resposta bem-sucedida, a chave local é removida. Se o armazenamento do navegador
estiver indisponível, a operação pode prosseguir, mas não há garantia de reenvio
idempotente nessa sessão.

Sem edicao, cancelamento, estorno, credito ou integracao WhatsApp nesta etapa.
Gastos continuam no modulo existente. Movimento usa a data efetiva do recebimento,
independentemente da data da entrega.

## Movimento do dia

GET `/api/estabelecimentos/{empresaId}/movimento?data=YYYY-MM-DD&pagina=0&tamanho=20`.
Exige sessao e vinculo com a empresa. Retorna `data`, `quantidadeEntregas`,
`totalLitros`, `totalEntregas`, `totalRecebido`, `totalGasto`, `saldoDoDia` e
`recebimentos` (`itens`, `pagina`, `tamanho`, `total`). Cada recebimento inclui
`id`, `entregaId`, `data`, `valor`, `identificacao` e `dataEntrega`.

Quantidade/litros incluem entregas sem cobranca. Total de entregas considera
apenas valores cobrados. Recebido soma pagamentos pela data efetiva; saldo do
dia e recebido menos gastos, nao saldo acumulado nem lucro. Totais incluem
todas as paginas. O endpoint pagina somente recebimentos; entregas e gastos
usam suas consultas existentes. Leitura do resumo e pagina usa snapshot da
mesma transacao. Listas carregadas separadamente podem refletir atualizacoes
mais recentes; use Atualizar para recarregar.

Na validação inicial, não houve migração além da V7. A V8 e os testes de reenvio
foram acrescentados posteriormente, conforme o estado atual. Testes de integração `EntregaIT` adicionados
para pagamentos tardios, isolamento e concorrencia; resultados desta execucao
ficam em estado-atual.md.

Validação de 27/10/2026: a suíte integrada inicial passou com 25 testes em
PostgreSQL descartável. EntregaIT foi ampliado de dois para oito cenários e
reexecutado com sucesso, junto dos 71 testes rápidos. Os seis cenários novos
cobrem centavos/quitação/totais entre páginas, rejeições sem escrita, limite
monetário e agregados, rollback após flush, cliente cadastrado com nome histórico
e isolamento HTTP. Na validação registrada abaixo, as migrações V1–V7 foram aplicadas e validadas somente nos
bancos temporários; nenhum banco operacional foi usado.

Frontend, revalidado em 28/10: 71 testes e build TypeScript/Vite passaram.
19 cenários de navegador com API real e banco descartável foram aprovados,
incluindo reenvio após resposta perdida, pagamento parcial/posterior, rejeições,
totais, foco e respostas atrasadas após troca de empresa. Validado Edge com
larguras responsivas desktop/mobile;
reprodução e limites no [guia](validacao-interface.md). O teste de rollback usa
transação real e falha simulada; os testes HTTP Java continuam usando MockMvc.
Nesta revalidação, `.\mvnw.cmd -o verify` passou com 71 testes rápidos e 35
integrados, no total aplicando V1–V8 aos bancos temporários. Detalhes em
[estado atual](estado-atual.md).

Validacao da primeira etapa: `EntregaServiceTest` e `EntregaWebTest` cobrem regras financeiras,
autorizacao, sessao, CSRF e identidade da sessao. Suite rapida executada com
`.\mvnw.cmd -o '-Daether.syncContext.named.factory=noop' test`: 65 testes passaram.
Depois, a entrada de litros foi endurecida para rejeitar fracao sem truncamento;
revalidacao com `-Dtest=EntregaServiceTest,EntregaWebTest` passou: 10 testes,
zero falhas ou ignorados. PostgreSQL e concorrencia real ainda nao
validados. Nenhuma migracao foi aplicada ao banco local.
