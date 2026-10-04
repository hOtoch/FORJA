# Research: Forja, Temporada 1

Decisões técnicas da fase 0. Critério geral pedido pelo usuário: o mais simples possível, publicado na Vercel, bonito e funcional.

## 1. Framework

- **Decision**: Next.js 16 (App Router) com TypeScript e React 19, criado com `create-next-app`.
- **Rationale**: é o caminho nativo da Vercel (zero configuração de deploy). Páginas renderizadas no servidor leem os dados direto, e Server Actions fazem as gravações sem precisar de uma API REST separada.
- **Alternatives considered**: Vite + API serverless separada (dois mundos para manter); FastAPI (o usuário conhece, mas a Vercel trata Python como função avulsa, com mais atrito).

## 2. Estilo

- **Decision**: Tailwind CSS 4 com tokens em variáveis CSS (`@theme`), seguindo o DESIGN.md.
- **Rationale**: vem pronto no `create-next-app`. Tokens em CSS permitem o tema claro/escuro só trocando variáveis.
- **Alternatives considered**: CSS Modules puro (mais arquivos), biblioteca de componentes (puxaria o visual para o genérico que o DESIGN.md proíbe).

## 3. Banco

- **Decision**: Postgres no Neon (plano gratuito, ligado pela Vercel), acessado com `@neondatabase/serverless` e SQL simples, sem ORM. Em desenvolvimento local, sem `DATABASE_URL`, os dados ficam num arquivo JSON (`.data/forja.json`) com a mesma interface.
- **Rationale**:
  - O volume é minúsculo: um usuário e algumas centenas de registros na temporada.
  - Duas tabelas genéricas resolvem tudo: `records` e `kv` (ver `data-model.md`).
  - Carregar todos os registros da temporada e calcular em memória é instantâneo e elimina consultas complexas.
  - O modo arquivo deixa o app rodar no PC antes de existir conta na Vercel ou no Neon.
- **Alternatives considered**:
  - Drizzle ou Prisma: migrações e geração de tipos para duas tabelas é peso desnecessário.
  - Upstash Redis: menos natural para filtrar por dia e exportar.
  - SQLite: não funciona em função serverless sem armazenamento persistente.

## 4. Regras do jogo

- **Decision**: um motor de regras em funções puras (`computeGameState(records, config, now)`), sem estado guardado. Testes com Vitest cobrindo os cenários de aceite do spec.
- **Rationale**:
  - Sequência, escudos, chefe, nota, Fundo e previsão dependem uns dos outros. Recalcular tudo a partir dos registros garante consistência quando uma regra mudar.
  - Funções puras são fáceis de testar com datas fixas.
- **Alternatives considered**: guardar contadores no banco (risco de divergência, mais escrita).

## 5. Datas e fuso

- **Decision**:
  - O "dia do jogo" é a data em America/Sao_Paulo depois de subtrair 4 horas do instante.
  - Datas são strings `YYYY-MM-DD`.
  - A conversão usa `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`, sem biblioteca de datas.
- **Rationale**: o Brasil não tem horário de verão desde 2019, mas `Intl` cobre qualquer mudança. Evita dependência.
- **Alternatives considered**: date-fns-tz e Luxon (dependência extra para uma conversão).

## 6. Acesso

- **Decision**:
  - Senha única em `FORJA_PASSWORD`.
  - Ao entrar, o servidor grava um cookie `forja_session` (httpOnly, secure, sameSite lax, 1 ano) com um token assinado por HMAC-SHA256 usando `FORJA_SECRET`.
  - O `proxy.ts` (nome do middleware no Next.js 16, que roda em Node) valida o cookie com Web Crypto e manda para `/entrar` quem não tem sessão.
  - O endpoint de status usa um token separado, `FORJA_STATUS_TOKEN`.
- **Rationale**: um usuário, sem cadastro. Não precisa de biblioteca de autenticação.
- **Alternatives considered**: Auth.js com Google (configuração externa), proteção de deployment da Vercel (limitada no plano gratuito).

## 7. Timer

- **Decision**:
  - O estado do timer fica no servidor, na chave `timer` da tabela `kv`, guardando o início, o acumulado e a última confirmação de presença.
  - O tempo creditado é calculado: o tempo depois de "última confirmação + 50 min" fica pendente até o usuário decidir, e cada sessão tem teto de 3h.
  - O navegador só exibe a contagem e dispara a notificação ("Ainda estudando?") pela Notification API.
  - O Pomodoro é feito no cliente: aos 25 min ele chama "pausar" e mostra a pausa de 5 min.
- **Rationale**: fechar a aba não perde nada, e o servidor nunca precisa de processo rodando.
- **Alternatives considered**: timer só no navegador (perde ao fechar), Web Push (exige servidor de push e chaves VAPID).

## 8. Aparição diária no Windows

- **Decision**:
  - Dois scripts PowerShell compatíveis com o Windows PowerShell 5.1 (`scripts/windows/`).
  - Registrados como tarefas agendadas por um instalador com confirmação.
  - **"Forja abrir":** dispara ao fazer logon, ao desbloquear e a cada 30 min. Abre o app no Chrome (perfil `Profile 4`) se ainda não abriu hoje (marcador local com o dia do jogo) e se houve uso do teclado ou mouse nos últimos 5 min.
  - **"Forja lembrete":** às 21h, consulta `/api/status` e abre o app se `studyDone` for falso ou `weekAtRisk` for verdadeiro.
- **Rationale**: o histórico do Windows mostrou que em 1 de cada 3 dias o PC passa a noite ligado, então só o logon não basta.
- **Alternatives considered**: página inicial do Chrome (não cobre o PC ligado), extensão de nova aba (descartada pelo usuário).

## 9. Visual medieval

- **Decision**: manter a estrutura do DESIGN.md (a barra de 80 dias como peça principal, cores do metal aquecido, marca do ferreiro na nota) e mudar a ambientação para forja medieval de RPG, conforme pedido explícito do usuário em 03/10/2026:
  - **Tipografia**: Grenze Gotisch (gótica legível) nos títulos, no nome Forja e na letra da nota; Grenze (a romana da mesma família) nos números grandes; Alegreya Sans, de raiz caligráfica, no texto da interface.
  - **Tema claro**: pergaminho envelhecido em vez de zinco, com texto em tinta ferrosa.
  - **Tema escuro**: fuligem de forja.
  - **Escudos**: brasões em azul heráldico.
  - **Baús**: com cintas de ferro.
  - **Depósito confirmado**: selo de cera.
- **Rationale**: o pedido explícito do cliente vence a cautela anterior contra fontes medievais. As três famílias existem no Google Fonts (verificado). A barra e a escala de calor continuam sendo o elemento ousado único.
- **Alternatives considered**: Cinzel e MedievalSharp (mais clichê e menos legíveis); UnifrakturCook (gótica ilegível em tamanho de interface).

## 10. Testes e verificação

- **Decision**:
  - Vitest para o motor de regras: cenários do spec com datas fixas, incluindo a temporada perfeita, que tem que dar R$ 1.500 e nota S.
  - Verificação visual manual com o servidor local em 1920 × 919 e em 375 px.
- **Rationale**: o risco está nas regras. A interface é verificada vendo.
- **Alternatives considered**: testes de ponta a ponta com Playwright (custo alto para um usuário só, fica para depois).
