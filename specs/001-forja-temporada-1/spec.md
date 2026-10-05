# Feature Specification: Forja, Temporada 1 (Operação Réveillon)

**Feature Branch**: `001-forja-temporada-1`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: app pessoal de hábitos com temática de RPG medieval e forja medieval para manter estudo diário, academia e cardio até 23/12/2026, com XP, níveis, escudos, chefe semanal, nota final, Fundo Réveillon, baús, fila de cursos com previsão e aparição diária no PC. Regras definidas na sessão de perguntas de 03/10/2026.

## Contexto

O Forja existe para uma pessoa só manter três hábitos durante a Temporada 1, de segunda, 05/10/2026, a quarta, 23/12/2026. São 80 dias, com semanas de segunda a domingo: 11 semanas cheias e uma semana final de 3 dias (21 a 23/12). O dia vira às 04:00 no horário de Brasília. A temporada mira a viagem de Réveillon em 28/12.

A ambientação é uma forja medieval de RPG: o usuário é o ferreiro e o metal ao mesmo tempo, e cada dia cumprido aquece um segmento da barra da temporada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estudar a partir do painel do dia (Priority: P1)

O usuário abre o Forja, vê o que falta hoje e clica em "Estudar agora". A próxima aula do curso atual abre numa aba nova e o timer começa. Ao terminar, ele encerra a sessão, confirma até qual aula chegou e vê os minutos do dia e a barra da temporada atualizados.

**Why this priority**: estudar 1h por dia é a meta central. Sem isso não existe produto. Esta história sozinha já é um MVP útil: um painel que leva ao estudo e mede o tempo.

**Independent Test**: entrar com a senha, iniciar o estudo, deixar o timer correr, encerrar confirmando a aula e conferir que os minutos do dia, a próxima aula e o segmento de hoje mudaram.

**Acceptance Scenarios**:

1. **Given** o usuário não está conectado, **When** abre o app, **Then** vê só a tela de senha; com a senha certa, entra e continua conectado por 1 ano no mesmo navegador.
2. **Given** é 12/10 e o curso atual tem uma próxima aula, **When** o usuário clica em "Estudar agora", **Then** a aula abre numa aba nova da plataforma do curso e o timer começa no painel.
3. **Given** um timer em andamento, **When** o usuário fecha a aba e volta depois, **Then** o timer continua contando desde o início da sessão.
4. **Given** o timer passou de 50 minutos desde a última confirmação, **When** o usuário não responde à pergunta "Ainda estudando?", **Then** o timer pausa e, na volta, pergunta se o intervalo foi estudo; só conta se o usuário disser que sim.
5. **Given** uma sessão em andamento, **When** o usuário clica em "Encerrar sessão", **Then** o app pede para confirmar até qual aula ele chegou, sugerindo a próxima da fila, e salva a sessão com os minutos e as aulas.
6. **Given** o usuário somou 60 minutos ou mais no dia, **When** o painel atualiza, **Then** a meta de hoje aparece como cumprida e o segmento de hoje muda de cor na barra.
7. **Given** uma sessão começou às 03:30, **When** termina às 04:30, **Then** os minutos contam inteiros para o dia em que ela começou.

---

### User Story 2 - Registrar treinos e cardios e enfrentar o chefe da semana (Priority: P1)

O usuário marca os treinos de academia e os cardios do dia. O painel mostra o chefe da semana com o que falta para derrotá-lo: estudo em todos os dias que não são folga, 4 treinos e 5 cardios com pelo menos um supercardio.

**Why this priority**: academia e cardio são as outras duas metas da temporada e o chefe semanal é o ritmo da semana. Sem isso o app só mede estudo.

**Independent Test**: marcar treinos e cardios em dias diferentes de uma semana e conferir os contadores do chefe, o reconhecimento do supercardio e a vitória quando as três metas fecham.

**Acceptance Scenarios**:

1. **Given** é segunda, **When** o usuário clica em "Marcar treino", **Then** a semana passa a mostrar 1 de 4 treinos.
2. **Given** o usuário registra um cardio de bicicleta com 60 minutos, **When** salva, **Then** o app avisa antes de salvar que conta como supercardio e o chefe mostra o supercardio como feito.
3. **Given** o usuário registra uma caminhada de 15 minutos, **When** tenta salvar, **Then** o app explica que cardio precisa de pelo menos 20 minutos e não salva.
4. **Given** uma pelada de qualquer duração, **When** é registrada, **Then** conta como supercardio.
5. **Given** o usuário cumpriu o estudo em todos os dias não-folga, 4 treinos e 5 cardios com supercardio até domingo, **When** a semana fecha, **Then** o chefe aparece derrotado e rende 1 escudo, 100 XP e R$ 30 no Fundo.
6. **Given** a semana final (21 a 23/12), **When** o usuário faz estudo nos 3 dias, 2 treinos e 2 cardios, **Then** o chefe final é derrotado sem exigir supercardio e rende R$ 45 e 100 XP, sem escudo.
7. **Given** é ontem às 23h e o usuário esqueceu de registrar, **When** registra hoje um treino para ontem, **Then** o registro é aceito; para anteontem, é recusado.

---

### User Story 3 - Evoluir o personagem: XP, níveis, sequência, escudos e nota (Priority: P2)

Cada esforço vira XP nos atributos Inteligência, Força e Vigor; o personagem sobe de nível e ganha títulos de ferreiro. A sequência de estudo é protegida por escudos, e o painel mostra a nota prevista para 23/12.

**Why this priority**: é a camada de jogo que mantém a motivação, mas depende dos registros das histórias 1 e 2.

**Independent Test**: com uma série de registros conhecida, conferir XP por atributo, nível, título, sequência, uso automático de escudo e nota prevista.

**Acceptance Scenarios**:

1. **Given** o usuário estudou 150 minutos num dia, **When** o XP é calculado, **Then** o estudo rende 120 XP de Inteligência (teto diário).
2. **Given** o usuário tem 1 escudo e não cumpriu a meta de estudo ontem, **When** o painel abre hoje, **Then** o escudo foi usado, a sequência continua e o app avisa que, se hoje também ficar sem estudo, a sequência quebra.
3. **Given** o usuário falhou dois dias seguidos, **When** o segundo dia fecha, **Then** a sequência quebra mesmo havendo escudo.
4. **Given** uma semana com um dia salvo por escudo, **When** a semana fecha com as outras metas batidas, **Then** o chefe não é derrotado.
5. **Given** o XP total chega a 300, **When** o painel atualiza, **Then** o personagem está no nível 2; com 1.200 XP, nível 4 com o título "Malhador".
6. **Given** os registros até hoje, **When** o painel abre, **Then** mostra a nota prevista (S, A, B ou C) e a porcentagem de estudo, academia e cardio.

---

### User Story 4 - Juntar o Fundo Réveillon e abrir os baús (Priority: P2)

O usuário vê quanto já ganhou para o Fundo Réveillon, recebe na segunda o valor a depositar da semana que fechou e marca o depósito como feito. Os cinco baús ficam visíveis desde o início, trancados, e abrem quando a condição é cumprida. Um botão registra cliente fechado e soma 5% do contrato ao Fundo.

**Why this priority**: o dinheiro e os prêmios reais ligam o jogo à viagem, mas não são necessários para registrar os hábitos.

**Independent Test**: com uma semana completa de registros, conferir o valor a depositar, marcar como depositado, registrar um cliente e conferir a abertura do primeiro baú.

**Acceptance Scenarios**:

1. **Given** uma semana fechada com 7 dias de estudo, 5 treinos e 6 cardios com supercardio, **When** chega segunda às 04:00, **Then** o app pede um depósito de R$ 35 + R$ 40 + R$ 25 + R$ 30 = R$ 130 (excedentes não rendem dinheiro).
2. **Given** um depósito pendente, **When** o usuário clica em "Marcar como depositado", **Then** o app confirma com "Depósito confirmado" e o valor passa para o total depositado.
3. **Given** um contrato de R$ 3.000, **When** o usuário registra cliente fechado, **Then** o app mostra antes de salvar que o bônus é R$ 150 e o soma ao Fundo.
4. **Given** o primeiro chefe foi derrotado, **When** o painel atualiza, **Then** o baú 1 aparece aberto com a data de abertura.
5. **Given** a temporada inteira cumprida, **When** os valores são somados, **Then** o Fundo dá exatamente R$ 1.500 (sem contar bônus de clientes nem baús).

---

### User Story 5 - Seguir a fila de cursos e ver quando vai terminar (Priority: P3)

O usuário vê os três cursos da fila, em que módulo e aula está, o que falta e a data prevista para terminar cada curso e a fila inteira, no seu ritmo real.

**Why this priority**: dá direção ao estudo e alimenta o "Estudar agora", mas a meta diária já funciona sem a previsão.

**Independent Test**: com aulas concluídas e sessões registradas, conferir a próxima aula, os módulos concluídos e as datas previstas.

**Acceptance Scenarios**:

1. **Given** o início da temporada, **When** o usuário abre os cursos, **Then** o primeiro curso já tem o módulo 1 e a aula 1 do módulo 2 concluídos e os outros dois estão do zero.
2. **Given** o usuário marca a última aula de um módulo, **When** salva a sessão, **Then** o módulo aparece concluído e rende 50 XP; ao concluir o curso, rende 200 XP e uma medalha.
3. **Given** menos de 3 sessões registradas, **When** a previsão é calculada, **Then** supõe que cada minuto de vídeo leva 1,5 minuto de estudo; depois disso, usa o ritmo dos últimos 14 dias.
4. **Given** a previsão indica que a fila termina antes de 23/12, **When** o usuário abre o painel, **Then** vê um aviso para escolher o próximo curso.

---

### User Story 6 - O app aparece sozinho todo dia e lembra às 21h (Priority: P3)

O app abre sozinho no navegador na primeira vez em que o usuário usa o PC depois das 04:00, mesmo que o PC tenha ficado ligado durante a noite. Às 21h, se o estudo do dia não foi feito ou a semana corre risco, abre de novo.

**Why this priority**: garante a presença diária, mas o app é útil mesmo aberto à mão.

**Independent Test**: instalar a automação no PC, simular o primeiro uso do dia e o horário das 21h, e conferir que o app abre uma vez por dia e só reabre às 21h quando há risco.

**Acceptance Scenarios**:

1. **Given** o PC ficou ligado a noite toda, **When** o usuário volta a usá-lo às 09:30, **Then** o app abre uma vez e não abre de novo nesse dia.
2. **Given** são 21h e o estudo de hoje já foi cumprido e a semana não corre risco, **When** a checagem roda, **Then** nada abre.
3. **Given** são 21h de sábado e faltam 2 treinos, **When** a checagem roda, **Then** o app abre porque a semana corre risco.

---

### User Story 7 - Folgas, histórico do dia e exportação (Priority: P3)

O usuário vê as folgas planejadas, usa uma das 2 folgas de reserva quando precisa, abre o detalhe de qualquer dia clicando na barra e exporta todos os dados.

**Why this priority**: são ajustes e consultas; o núcleo funciona sem eles.

**Independent Test**: usar uma folga de reserva hoje, abrir o detalhe de um dia passado e exportar os dados.

**Acceptance Scenarios**:

1. **Given** 10 a 13/10 são folga planejada, **When** o usuário não estuda nesses dias, **Then** a sequência não quebra nem cresce e esses dias não entram na nota nem no Fundo.
2. **Given** restam 2 folgas de reserva, **When** o usuário clica em "Usar folga" hoje, **Then** o app confirma "Folga marcada para hoje" e restam 1; ontem não pode mais virar folga.
3. **Given** um dia passado, **When** o usuário clica no segmento dele na barra, **Then** vê sessões, aulas, treinos, cardios, o calor do dia e o que ele rendeu.
4. **Given** qualquer momento, **When** o usuário pede a exportação, **Then** recebe um arquivo com todos os registros da temporada.

---

### Edge Cases

- **Timer esquecido ligado:** a sessão para de contar em 3 horas, mesmo sem resposta.
- **Duas sessões ao mesmo tempo:** não pode existir mais de uma sessão de estudo em andamento.
- **Registro antigo:** registrar algo para mais de um dia atrás é recusado com uma explicação.
- **Registro futuro:** registrar algo para o futuro é recusado.
- **Data fora da temporada:** antes de 05/10 ou depois de 23/12, os registros não contam para metas, nota, Fundo nem chefe. Contam só como XP, para lembrança.
- **Escudo com o estoque cheio:** derrotar um chefe com 2 escudos guardados não acumula um terceiro.
- **Aula sem duração na plataforma:** entra como 8 minutos nos cálculos de previsão.
- **Fim da fila:** quando todas as aulas forem concluídas, "Estudar agora" continua ligando o timer, mas avisa que não há próxima aula.
- **Folga de reserva esgotada:** "Usar folga" fica indisponível, com o motivo explicado.
- **Senha errada:** a tela informa "Senha incorreta. Confira e tente de novo." e não revela mais nada.
- **Sem conexão ao salvar:** o app diz que o registro não foi salvo e permite tentar de novo, sem perder o que foi digitado.
- **Atraso do lembrete:** o lembrete das 21h nunca abre o app mais de uma vez por dia.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso e dados**

- **FR-001**: O sistema MUST exigir uma senha única para qualquer acesso e manter o usuário conectado por 1 ano no mesmo navegador.
- **FR-002**: O sistema MUST guardar os registros num servidor, de forma que o mesmo histórico apareça em qualquer navegador conectado.
- **FR-003**: O usuário MUST conseguir exportar todos os registros da temporada num arquivo.
- **FR-004**: O sistema MUST oferecer uma consulta de status protegida por um código próprio, só de leitura, que responde se o estudo de hoje foi cumprido e se a semana corre risco.

**Calendário e regras do dia**

- **FR-005**: O sistema MUST considerar a Temporada 1 de 05/10/2026 a 23/12/2026, com semanas de segunda a domingo e uma semana final de 21 a 23/12.
- **FR-006**: O sistema MUST virar o dia às 04:00 do horário de Brasília.
- **FR-007**: O sistema MUST aceitar registros manuais só para hoje e ontem.
- **FR-008**: O sistema MUST tratar 10, 11, 12 e 13/10 como folga planejada e permitir até 2 folgas de reserva, marcáveis até o fim do próprio dia.

**Estudo**

- **FR-009**: "Estudar agora" MUST iniciar o timer no curso atual e abrir a próxima aula do curso numa aba nova.
- **FR-010**: O timer MUST continuar existindo se o navegador for fechado e permitir só uma sessão em andamento.
- **FR-011**: O timer MUST perguntar "Ainda estudando?" a cada 50 minutos, inclusive por notificação do sistema operacional quando permitida. Sem resposta, pausa; na volta, o usuário decide se o intervalo conta.
- **FR-012**: O timer MUST limitar cada sessão a 3 horas.
- **FR-013**: O timer MUST oferecer um modo Pomodoro opcional (25 minutos de foco e 5 de pausa), sem contar as pausas como estudo.
- **FR-014**: Ao encerrar uma sessão, o usuário MUST confirmar até qual aula chegou, com a próxima aula sugerida, podendo avançar mais de uma.
- **FR-015**: O sistema MUST permitir registrar estudo manualmente com minutos, curso e última aula concluída.
- **FR-016**: A meta de estudo do dia MUST ser cumprida com 60 minutos ou mais, e uma sessão MUST contar no dia em que começou.

**Treino e cardio**

- **FR-017**: O usuário MUST conseguir marcar um treino de academia com um clique.
- **FR-018**: O usuário MUST conseguir registrar cardio informando modalidade (esteira, bicicleta, caminhada, elíptico, pelada ou outro) e minutos. Cardio exige 20 minutos ou mais, exceto pelada.
- **FR-019**: O sistema MUST classificar como supercardio a pelada de qualquer duração e a bicicleta, caminhada ou esteira com 60 minutos ou mais, e avisar isso antes de salvar.
- **FR-020**: O sistema MUST aceitar qualquer número de cardios por dia, contando cada registro como uma sessão.

**Metas semanais e chefe**

- **FR-021**: As metas semanais MUST ser: 4 treinos e 5 cardios com pelo menos 1 supercardio. Na semana final, 2 treinos e 2 cardios sem exigir supercardio.
- **FR-022**: O chefe da semana MUST ser derrotado quando a meta de estudo for cumprida em todos os dias não-folga da semana, sem dia salvo por escudo, e as metas de treino e cardio forem batidas.
- **FR-023**: Cada chefe derrotado MUST render 1 escudo (exceto o chefe final), 100 XP e R$ 30 no Fundo. O chefe final rende R$ 45.
- **FR-024**: O sistema MUST considerar que a semana corre risco quando os treinos que faltam forem iguais ou maiores que os dias restantes da semana (contando hoje), ou quando o supercardio ainda não foi feito a partir de sábado.

**Personagem e sequência**

- **FR-025**: O sistema MUST calcular XP com:

  | Ação | XP |
  |---|---|
  | Minuto de estudo | 1 (até 120 por dia) |
  | Treino | 60 |
  | Cardio | 20 |
  | Supercardio | 60 |
  | Módulo concluído | 50 |
  | Curso concluído | 200 |
  | Chefe derrotado | 100 |

  O XP vai para Inteligência (estudo e cursos), Força (academia) e Vigor (cardio). O XP do chefe é dividido igualmente entre os três atributos.
- **FR-026**: O nível N MUST exigir 50 × N × (N + 1) XP no total.
- **FR-027**: Os títulos MUST ser:

  | Nível | Título |
  |---|---|
  | 1 | Aprendiz da forja |
  | 3 | Malhador |
  | 6 | Ferreiro |
  | 9 | Armeiro |
  | 12 | Mestre ferreiro |
  | 15 | Lenda da forja |

- **FR-028**: O sistema MUST manter a sequência de estudo em dias consecutivos com meta cumprida. Dias de folga não quebram nem somam.
- **FR-029**: O sistema MUST começar com 1 escudo e permitir no máximo 2. O escudo é usado automaticamente num dia passado sem a meta de estudo, mas nunca no segundo dia seguido sem estudo.

**Nota**

- **FR-030**: A nota MUST ser a média simples das porcentagens de estudo, academia e cardio. Cada semana entra com no máximo a sua meta, e uma semana cheia sem supercardio conta no máximo 4 cardios.
- **FR-031**: Dias salvos por escudo MUST não contar como cumpridos na nota nem no Fundo.
- **FR-032**: As faixas da nota MUST ser S a partir de 95%, A a partir de 85%, B a partir de 70% e C abaixo disso. O painel MUST mostrar diariamente a nota prevista se o ritmo for mantido.

**Fundo e prêmios**

- **FR-033**: O Fundo MUST somar:
  - R$ 5 por dia de estudo cumprido;
  - R$ 10 por treino e R$ 5 por cardio, até a meta da semana;
  - R$ 30 por chefe e R$ 45 pelo chefe final.

  Excedentes, dias de folga e dias salvos por escudo não rendem dinheiro.
- **FR-034**: Depois que a semana fechar, o sistema MUST mostrar o valor a depositar e permitir marcá-lo como depositado.
- **FR-035**: O usuário MUST conseguir registrar cliente fechado com o valor do contrato. O sistema soma 5% ao Fundo e mostra o bônus antes de salvar.
- **FR-036**: O sistema MUST mostrar os 5 baús desde o início, com condição e prêmio, e abri-los automaticamente quando a condição for cumprida:

  | Baú | Condição | Prêmio |
  |---|---|---|
  | 1 | Primeiro chefe derrotado | Um jantar especial na viagem de 10/10 |
  | 2 | 21 dias seguidos de estudo | Um curso ou ferramenta para clientes |
  | 3 | Nota prevista A ou melhor em 13/11 | Tênis ou roupa de treino |
  | 4 | 50 horas de estudo | A roupa do Réveillon |
  | 5 | Nota final em 23/12 | Com S, R$ 300 a mais; com A, R$ 150 a mais |

**Cursos**

- **FR-037**: O sistema MUST seguir a fila Desenvolvimento assistido por IA → Python Full AI (profissional) → Python Full AI (Acadêmico), com módulos, aulas, durações e endereço de cada aula conforme o catálogo do projeto.
- **FR-038**: O sistema MUST começar com o módulo 1 e a aula 1 do módulo 2 do primeiro curso concluídos.
- **FR-039**: O sistema MUST concluir um módulo automaticamente quando a sua última aula for concluída, e um curso quando todos os módulos forem concluídos.
- **FR-040**: O sistema MUST prever a data de término de cada curso e da fila pelo ritmo de minutos de vídeo concluídos por dia de estudo nos últimos 14 dias.
  - Com menos de 3 sessões, supõe 1,5 minuto de estudo por minuto de vídeo.
  - Aula sem duração conta como 8 minutos.
  - O sistema avisa se a fila acabar antes de 23/12.

**Painel e aparência**

- **FR-041**: O painel MUST mostrar, em cartões na ordem abaixo (a meta de hoje, o chefe e a barra sem rolagem numa tela de 1920 × 919):
  - a barra da temporada com os 80 dias;
  - "Hoje", com o timer;
  - o chefe da semana;
  - o personagem;
  - a nota prevista;
  - o Fundo;
  - a fila de cursos;
  - os baús.
- **FR-042**: Cada dia na barra MUST mostrar o calor do dia (ferro frio, cereja, brasa, palha ou incandescente) conforme o estudo e os pontos de calor, além de folga, dia salvo por escudo, dias futuros e o dia de hoje. Clicar abre o detalhe do dia.
- **FR-043**: A interface MUST ter ambientação de forja medieval de RPG, seguindo o DESIGN.md do projeto, em português do Brasil. O tema claro ou escuro segue o sistema operacional.
- **FR-044**: A interface MUST funcionar no celular, em uma coluna.

**Aparição diária**

- **FR-045**: O projeto MUST incluir uma automação para o Windows que:
  - abre o app uma vez por dia, no primeiro uso do PC depois das 04:00;
  - às 21h, abre de novo se o estudo do dia não foi cumprido ou se a semana corre risco.

  A instalação exige confirmação do usuário, e há uma forma de desinstalar.

### Key Entities

- **Temporada**: período com datas, metas, folgas planejadas, quantidade de folgas de reserva, valores do Fundo, tabela de XP, faixas da nota, baús e títulos. A Temporada 1 é "Operação Réveillon".
- **Sessão de estudo**: dia, curso, início, fim, minutos creditados, origem (timer ou manual).
- **Sessão em andamento**: curso, início, última confirmação de presença, pausa, modo Pomodoro.
- **Aula concluída**: curso, aula, momento da conclusão.
- **Atividade física**: dia, tipo (treino ou cardio), modalidade, minutos, se é supercardio.
- **Folga**: dia e tipo (planejada ou reserva).
- **Depósito**: semana, valor, momento da confirmação.
- **Bônus de cliente**: data, valor do contrato, valor do bônus, observação.
- **Curso, módulo e aula**: catálogo fixo da fila, com duração e endereço de cada aula.
- **Estado do jogo** (sempre calculado a partir dos registros, nunca guardado): sequência, escudos, chefes, XP, nível, título, nota, Fundo, baús e previsões.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Do momento em que o app aparece até o timer de estudo correndo com a aula aberta: no máximo 1 clique e 5 segundos.
- **SC-002**: Um treino ou um cardio é registrado em até 3 interações.
- **SC-003**: Numa tela de 1920 × 919, o usuário vê sem rolar o que decide o dia: a meta de hoje com o botão de estudar, o chefe da semana e a barra da temporada. O resto (personagem, Fundo, nota, estudo dos 14 dias, cursos e baús) vem logo abaixo, agrupado em cartões. Revisado em 05/10/2026, depois do retorno de que o painel sem rolagem ficava embolado.
- **SC-004**: Com o cenário de temporada perfeita, o app mostra exatamente:
  - R$ 1.500 no Fundo;
  - nota S;
  - todos os chefes derrotados.
- **SC-005**: Todas as regras de cálculo (sequência, escudos, chefe, XP, nível, nota, Fundo, previsão) dão o resultado esperado nos cenários de aceite deste documento.
- **SC-006**: Em pelo menos 95% dos dias em que o PC é usado, o app aparece sozinho, inclusive nos dias em que o PC passou a noite ligado.
- **SC-007**: Nenhum registro feito com sucesso se perde ao fechar o navegador ou trocar de computador.
- **SC-008**: O usuário mantém a meta de estudo em pelo menos 85% dos dias que contam da Temporada 1 (meta de comportamento, medida pela própria nota).

## Assumptions

- Um único usuário, sem cadastro; a senha é definida na configuração da publicação.
- O usuário usa o Chrome num PC com Windows, tela 1920 × 1080 e tema claro; o celular é secundário.
- O catálogo dos três cursos foi lido da plataforma em 03/10/2026. Mudanças posteriores na plataforma exigem atualizar o catálogo.
- A abertura das aulas usa o endereço público de cada aula. O usuário já está conectado à plataforma do curso no navegador.
- Os depósitos do Fundo são feitos pelo usuário fora do app; o app só calcula e registra a confirmação.
- As regras numéricas (metas, XP, valores, faixas, datas) ficam numa configuração da temporada, para uma Temporada 2 em 2027.
- A publicação é gratuita. A criação de contas e a aceitação de termos dos serviços de publicação ficam com o usuário.
- Se o app não estiver pronto em 05/10, os primeiros dias podem ser lançados de uma vez, como exceção à regra de "hoje e ontem".
- Fora do escopo: vários usuários, notificações enviadas pelo servidor, leitura automática do progresso na plataforma do curso, controle financeiro além do Fundo e controle de clientes.
