# Identidade visual NextFlow

Referencia: `DESIGN.md` na raiz. A interface e React + TypeScript + Vite e CSS
proprio. Nenhuma biblioteca de UI, roteador ou framework CSS foi adicionado.
Nomes, textos, simbolo e dados de exemplo pertencem ao NextFlow.

## Regras aplicadas

| Regra da referencia | Aplicacao |
| --- | --- |
| Canvas branco e superficie alternativa #f5f5f5 | Login, navegacao, paineis e cabecalhos de tabela |
| Texto #171717 e secundario #525252 | Hierarquia compartilhada; tom Steel da referencia para contraste tambem em fundo #f5f5f5 |
| Azul #2563eb pontual | Links, navegacao ativa e linha do grafico; sem grandes fundos azuis |
| Inter e titulos de peso 500 | Inter usada tambem como substituta de Satoshi, conforme permitido |
| Titulos de 36–48px, corpo de 16px, dados de 14px | Titulos principais, login/apresentacao e tabelas; textos auxiliares de 11–12px |
| Espacamento baseado em 4px e gaps compactos | Intervalos de 8, 12, 16, 24, 32 e 40px |
| Bordas de 1px #e5e5e5 | Cards, tabelas, divisorias e controles secundarios |
| Cards 12px, campos 6px, botoes 8px, badges 9999px | Vocabulario compartilhado de componentes |
| Bordas em vez de elevacao pesada | Paineis sem sombra; sombra minima apenas em controles |
| CTA neutro escuro | Um objetivo principal por formulario ou tela; secundarios contornados |
| Conteudo limitado a 1200px, sidebar aproximadamente 240px | Area autenticada com menu lateral |
| Sem fotos ou ilustracoes decorativas | Icones SVG simples, grafico e interface como elementos visuais |

O arquivo oferece alternativas conflitantes para o CTA (safira, preto e pill).
Foi adotado o componente Filled Dark CTA com raio 8px, coerente com o resumo
de cores e o vocabulario de botoes. Campos usam borda neutra mais forte para
contraste, adaptando a recomendacao de borda preta. Cores de situacao foram
definidas semanticamente (paga/atrasada), sempre acompanhadas de texto.

## Tema escuro e celular

O DESIGN.md descreve tema claro. O escuro e uma adaptacao NextFlow em grafite,
mantendo contraste, hierarquia, bordas e destaque azul moderado. O seletor sol/lua
e a preferencia existente foram preservados.

Abaixo de 900px o menu lateral vira um menu recolhivel. Abaixo de 600px os
formularios passam a uma coluna e os filtros empilham. As tabelas tem rolagem
horizontal dentro do painel. Ha foco visivel, link de pular para conteudo,
rotulos nos campos, estados de erro/sucesso e suporte a movimento reduzido.

## Funcionalidade e navegacao atuais

Autenticacao, empresas e gastos do dia usam endpoints reais. A entrada padrao
abre Minha empresa. Visao geral, clientes, historico, pendencias e relatorios
mostram Em desenvolvimento dentro dos paineis existentes, sem dados ficticios,
filtros simulados, formularios sem gravacao ou exportacao de exemplo.

Rotas preservadas: #/empresa, #/dashboard, #/clientes, #/historico, #/pendentes,
#/despesas e #/relatorios. O hash despesas abre Gastos do dia.
Nao ha calculo de saldo financeiro geral ate integrar atendimentos e recebimentos.
O icone da empresa continua apenas local; os campos textuais usam a API.

## Arquivos e validacao

- frontend/src/styles.css: tokens e componentes compartilhados.
- frontend/src/components/Marca.tsx: marca NextFlow reutilizada.
- frontend/src/Workspace.tsx: navegacao e areas em desenvolvimento.
- frontend/src/Gastos.tsx: gastos reais e total do dia.
- frontend/src/Historico.tsx e src/demo/: legado fora da navegacao atual.

Os testes HTTP usam fetch simulado e nao substituem avaliacao visual.
Veja os resultados e pendencias em [estado atual](estado-atual.md).
