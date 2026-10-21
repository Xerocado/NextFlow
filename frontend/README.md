# Interface do NextFlow

Atualizacao de 21/10/2026: entregas e pagamentos integrados ao frontend,
com a API existente e migracao V7. Veja [contrato](../docs/entregas.md).
Caminho atual: C:\NextFlow.

## Movimento do dia

A aba Movimento do dia (rota preservada #/dashboard) reúne entregas, recebimentos
e gastos da data escolhida. Totais completos vêm do servidor, sem somar apenas a
página visível. Recebimentos usam sua data efetiva, inclusive para entregas antigas.
Saldo do dia é recebido menos gastos, sem representar saldo total ou lucro.
As três listas têm paginação independente. Trocar empresa/data cancela consultas
anteriores e limpa resultados. Links levam ao cadastro existente de entregas e gastos.
O backend deve disponibilizar GET /api/estabelecimentos/{empresaId}/movimento.

## Entregas e recebimentos

Selecione a empresa em Minha empresa e abra Historico de pedidos para registrar
uma entrega. Informe data, litros inteiros e valor total manual; escolha cliente
cadastrado (lista paginada) ou Nao identificado com identificacao opcional. Sem cobranca
permite valor zero e nao gera saldo pendente. Motivo e opcional.

Use Ver detalhes para consultar pagamentos e registrar recebimento integral ou
parcial, na data efetiva (inclusive retroativa, nunca futura), ate o saldo atual.
O registro da entrega e o pagamento sao duas operacoes independentes. Se o envio
falhar, Atualizar registros recarrega lista e detalhe: confira antes de repetir.
Nao ha repeticao automatica de escritas, edicao, exclusao ou estorno.

Historico e Pagamentos pendentes filtram pela data da entrega, inicialmente do
primeiro dia do mes ate hoje. Amplie o periodo para localizar dividas antigas.
As listas sao paginadas, sem apresentar total financeiro de uma pagina como total
geral. Cada entrega mostra valor, recebido, saldo e situacao. Recebimentos de
entregas antigas podem ocorrer em outra data; nao compor caixa pela data da entrega.

Validacao desta entrega: npm test passou (62 testes), incluindo cliente HTTP
contra servidor local de teste e renderizacao estatica de entregas, pendencias e estado inicial de Movimento do dia.
Consulta do movimento valida empresa/data/pagina e tratamento de falha sem expor detalhes internos. TypeScript
passou na etapa tsc do build; npm run build bloqueado pelo ambiente em spawn EPERM
ao iniciar esbuild. Postman CLI nao disponivel; simulacao Postman nao executada.
Nao validado nesta entrega: layout no navegador, fluxo autenticado com API real,
PostgreSQL e aplicacao de V7. Os testes locais nao comprovam essas etapas.
Reinicie a API no ambiente configurado para aplicar as migracoes existentes,
sem recriar o banco, e confira as telas com sua empresa selecionada.

## Estado atual

A interface usa React + TypeScript + Vite e CSS proprio, com temas claro/escuro.
Funcionalidades conectadas a API: cadastro de conta, login, sessao, logout,
recuperacao de senha, empresas, clientes, gastos variaveis, entregas e pagamentos.

Apos login sem uma rota especifica, abre Minha empresa. O usuario pode cadastrar,
selecionar e renomear empresas e salvar atividade, telefone e endereco. O icone
opcional (PNG, JPG ou WebP, ate 2 MB) fica apenas na memoria da pagina; nao e enviado
nem persistido no servidor. CNPJ nao faz parte do cadastro atual.
Veja [empresa](../docs/empresa-integracao.md).

Gastos do dia usa a empresa selecionada: descricao, valor e data obrigatorios;
categoria e observacao opcionais. Cada lancamento e uma saida efetiva de caixa,
sem repeticao automatica. A lista e paginada e mostra o total de todo o dia.
Veja [gastos](../docs/gastos.md). O backend precisa das migracoes ate V5.

Clientes permite cadastro, listagem paginada e edicao por empresa, com nome
obrigatorio, telefone e observacao opcionais. Nao ha exclusao nem saldos.
Selecione uma empresa em Minha empresa. A API precisa das migracoes ate V6.
Veja [clientes](../docs/clientes.md).

Relatorios continua mostrando Em desenvolvimento. Movimento do dia usa resumo
real e recebimentos por data efetiva retornados pela API. Nao ha listas ficticias, indicadores financeiros
simulados, filtros de demonstracao, formularios sem gravacao nem CSV de exemplo
na interface. 
As rotas hash anteriores permanecem acessiveis, com o aviso da respectiva area.

`src/Historico.tsx` e `src/demo/` sao codigo legado desconectado da aplicacao,
sem importacao pelo Workspace. Os testes dos exemplos permanecem como referencia
historica; nao comprovam regras financeiras reais nem persistencia.
Leia [estado e continuidade](../docs/estado-atual.md) antes de retomar o trabalho.

## Executar no Windows

Na raiz C:\NextFlow, inicie a API com `.\iniciar-dev.ps1` e configuracao local.
Em outro PowerShell, partindo da raiz:

```powershell
cd frontend
npm ci
npm run dev
```

Se as dependencias ja estiverem instaladas, basta `npm run dev`.
Abra http://localhost:5173, com backend em http://localhost:8080.
Use sempre localhost para nao misturar cookies com 127.0.0.1.
Node 24 ou superior e necessario para os testes com remocao nativa de tipos.
Nenhuma instalacao global, conta padrao ou senha padrao e necessaria.

## Sessao, recuperacao e CEP

O navegador guarda o cookie HttpOnly do Spring. A interface consulta `/me` ao
recarregar e busca CSRF antes das escritas. Nao guarda credenciais no localStorage;
somente a preferencia de tema em `nextflow.tema.v1`.
O proxy Vite encaminha `/api` ao backend sem mudar o CORS. Producao requer
planejamento proprio de HTTPS, cookie Secure e roteamento na mesma origem.
Nunca coloque segredos em variaveis VITE_*: sao publicas.

Recuperacao: codigo de seis numeros enviado pelo backend ao email cadastrado,
com validade de dez minutos, uso unico e bloqueio apos cinco erros. Nova senha
diferente da atual, minimo de 12 caracteres e maximo de 72 bytes UTF-8.
SMTP e configurado somente no backend; veja [autenticacao](../docs/autenticacao.md).

ViaCEP auxilia o endereco: envia apenas o CEP, sem cookies ou referencia da pagina.
Rua, bairro, cidade e UF podem ser editados depois. Falhas permitem preenchimento
manual. A busca nao salva: use Salvar dados da empresa para persistir o formulario.

## Arquivos principais

- `src/App.tsx`, `CadastroConta.tsx`, `RecuperarSenha.tsx`: acesso a conta.
- `src/Workspace.tsx`: navegacao e selecao da empresa.
- `src/Movimento.tsx`, `src/api/movimento.ts`: resumo e listas do dia.
- `src/Entregas.tsx`, `src/api/entregas.ts`: cadastro, historico, pendencias e pagamentos.
- `src/Empresas.tsx`, `MinhaEmpresa.tsx`: selecao e cadastro real da empresa.
- `src/Gastos.tsx`: formulario, lista e total diario de gastos reais.
- `src/Clientes.tsx`, `src/api/clientes.ts`: cadastro, lista e edicao de clientes.
- `src/api/`: clientes HTTP de autenticacao, empresas, gastos e ViaCEP.
- `src/styles.css`, `ThemeSwitch.tsx`, `components/Marca.tsx`: estilos e identidade.
- `vite.config.ts`: proxy local e portas de desenvolvimento/preview.

## Verificar

```powershell
npm test
npm run build
```

Testes HTTP usam fetch simulado; nao comprovam banco nem interface no navegador.
O build verifica TypeScript e gera dist. O ambiente do agente tem apresentado
spawn EPERM no Vite/esbuild; confira os resultados atuais em docs/estado-atual.md.
Para avaliar visualmente: entrar, navegar pelas sete abas, cadastrar/selecionar
empresa, conferir gastos do dia e sair. Verifique tambem tema escuro e celular.
A fonte Inter vem de Google Fonts, com Segoe UI como alternativa sem rede.
