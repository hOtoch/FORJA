# Forja: design

Sistema visual do Forja. Escrito com a skill `frontend-design`, antes de qualquer tela existir. Vale para o protótipo e para o app. Quando um componente novo surgir, ele segue estas regras ou este documento muda primeiro.

> **Revisão de 03/10/2026:** o usuário pediu ambientação de **forja medieval de RPG**. A estrutura continua a mesma: a barra de 80 dias, a escala de calor e a marca do ferreiro. Mudaram as fontes, os fundos (pergaminho e fuligem), o azul (agora heráldico) e alguns ícones.
>
> **Revisão 2, de 05/10/2026:** o usuário achou o painel confuso, embolado e pouco visual. Mudanças:
> - As informações foram agrupadas em **cartões de pergaminho**, um por pergunta, em vez de regiões soltas sobre o fundo.
> - O painel agora segue uma **ordem de prioridade**, e a página rola.
> - Entraram **ilustrações** (o ferreiro, os chefes da semana, os baús e a bolsa do Fundo) e **gráficos**: o anel da meta do dia, a barra de vida do chefe, a semana em ícones, medidores e as colunas dos últimos 14 dias.
> - Os gráficos seguem a skill `dataviz`.

---

## 1. Assunto, público e função

- **Assunto:** a forja de um ferreiro medieval, num mundo de RPG. Você aquece e martela o mesmo metal todo dia até ele virar uma peça. Cada dia de estudo e treino é uma martelada na barra da temporada. O painel é o livro de registros da oficina, escrito em pergaminho.
- **Público:** uma pessoa só, desenvolvedor e freelancer, que abre o app todo dia no Chrome de um PC com tela de 1920 × 1080 e Windows no tema claro.
- **Função principal:** em cinco segundos, mostrar o que falta hoje e como vai a temporada, e levar ao clique em "Estudar agora".

O vocabulário visual sai do ofício do ferreiro medieval:
- o ferro frio e a escala de cores do metal aquecido;
- o pergaminho e a tinta ferrosa dos registros;
- o azul dos brasões, os baús com cintas de ferro e o ouro das moedas;
- o selo de cera e a marca que o ferreiro punciona na peça pronta.

## 2. Princípios

1. **A barra é a tela.** A temporada é uma barra de ferro forjado com 80 segmentos, um por dia. É o único objeto escuro e com material sobre o pergaminho. Toda a ousadia do design fica nela; a ambientação medieval está na tipografia e nos ícones, não em molduras e ornamentos.
2. **Calor é informação.** As cores do metal aquecido marcam trabalho feito e nunca servem de enfeite. Laranja quer dizer "você esquentou o metal", não "cor da marca".
3. **Metal frio, não vergonha.** Um dia sem estudo aparece como ferro frio, cinza e sem brilho. Não há vermelho de erro, alerta ou culpa.
4. **Uma próxima ação, dita em palavras simples.** A página sempre deixa claro o próximo passo: "Estudar agora", "Marcar treino".
5. **Um cartão por pergunta.** Cada cartão responde a uma pergunta só ("o que faço hoje?", "como vai a semana?", "quanto já juntei?"). Os cartões são folhas de pergaminho mais claras, com borda fina e cantos de 14 px, sem sombra cinza e sem degradê. Dentro deles, um número ou um desenho é a coisa principal, e o texto explica.

## 3. Cor

### Paleta base

| Nome | Hex | Papel |
|---|---|---|
| Tinta ferrosa | `#2B241E` | Texto no tema claro e o contorno do botão principal. É a tinta dos manuscritos medievais |
| Pergaminho | `#EAE0CA` | Fundo no tema claro. Mais amarelado e escuro que o creme genérico, com textura de papel a 4% |
| Fuligem | `#1A1612` | Fundo no tema escuro |
| Brasa | `#E8681E` | Calor e a ação principal ("Estudar agora") |
| Ouro velho | `#7A5C14` | Dinheiro: o Fundo Réveillon e os depósitos (`#D4AC4F` no escuro) |
| Azul heráldico | `#2E4F9E` | Foco do teclado, links e escudos (os brasões). `#7E9BE0` no escuro |
| Cera | `#8E2A1C` | Só o selo de cera de "Depósito confirmado" |

### Escala de calor (só na barra e no progresso de hoje)

A escala segue as cores reais do metal aquecido. A luminância sobe de forma contínua, então a ordem continua legível para quem não distingue cores.

| Nível | Nome | Hex | Quando aparece |
|---|---|---|---|
| — | Por forjar | `#26211C` com contorno `#3A322A` | Dia futuro |
| 0 | Ferro frio | `#47423D` | Dia que passou sem a meta de estudo |
| 1 | Cereja | `#A3311F` | Estudou, mas menos de 60 min |
| 2 | Brasa | `#E8681E` | Meta de estudo cumprida |
| 3 | Palha | `#F3B54A` | Meta de estudo e mais 1 ponto de calor |
| 4 | Incandescente | `#FFF0CC` | Meta de estudo e mais 2 pontos de calor ou mais |

**Pontos de calor do dia:** 120 min de estudo valem 1 ponto, um treino vale 1 e um cardio vale 1.

**Marcas especiais nos segmentos:**
- **Folga:** listras diagonais em `#47423D` sobre `#26211C`.
- **Dia salvo por escudo:** ferro frio, com uma faixa de 3 px em azul heráldico no topo.

### Tokens

```css
:root {
  --bg: #EAE0CA;            /* Pergaminho */
  --surface: #F3ECDD;       /* campos, diálogos */
  --text: #2B241E;          /* Tinta ferrosa, 11,7:1 */
  --text-muted: #6B5A48;    /* sépia, 5,0:1 sobre o fundo */
  --line: #CDBF9F;          /* só onde a linha separa dados */
  --cta: #E8681E;           /* Brasa */
  --cta-text: #2B241E;      /* 4,7:1 sobre a Brasa */
  --focus: #2E4F9E;         /* Azul heráldico, 5,9:1 */
  --money: #7A5C14;         /* Ouro velho, 4,8:1 */
  --wax: #8E2A1C;           /* Cera */
  --track: #D8CBAE;         /* trilhos de medidores */

  /* a barra é sempre escura, nos dois temas: ferro forjado */
  --bar: #17130F;
  --heat-future: #26211C;
  --heat-future-line: #3A322A;
  --heat-0: #47423D;
  --heat-1: #A3311F;
  --heat-2: #E8681E;
  --heat-3: #F3B54A;
  --heat-4: #FFF0CC;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1A1612;           /* Fuligem */
    --surface: #241E19;
    --text: #EDE3CF;
    --text-muted: #B3A38A;   /* 7,3:1 */
    --line: #3D342B;
    --focus: #7E9BE0;        /* 6,6:1 */
    --money: #D4AC4F;        /* 7,4:1 */
    --track: #2E2721;
    --bar: #0F0C0A;
  }
}

:root[data-theme="dark"] { /* mesmos valores do bloco acima */ }
```

O tema segue o Windows por padrão. Hoje o Windows está no tema claro, então ele é o principal; o escuro tem que funcionar, mas é variante.

### Regras de uso

- **Brasa:** só para calor (barra, progresso de hoje) e para o botão "Estudar agora". Nunca como cor de texto no tema claro, porque o contraste não basta.
- **Ouro velho:** só para dinheiro.
- **Azul heráldico:** só para foco, links e escudos.
- **Cera:** só para o selo de depósito.
- **Todo o resto:** tinta ferrosa sobre pergaminho, com o tom sépia como secundário.
- **Nenhum degradê** em lugar nenhum.
- **Textura:** o pergaminho pode ter um ruído de papel (SVG `feTurbulence`) a 4% de opacidade, só no fundo da página. Nunca em textos ou controles.

## 4. Tipografia

| Família | Papel | Por quê |
|---|---|---|
| **Grenze Gotisch** | O nome Forja, os títulos de região e a letra da nota | Gótica (blackletter) desenhada para ser legível em tela. Dá o tom medieval na hora, sem a ilegibilidade das fraktur tradicionais |
| **Grenze** | Números grandes: timer, nível, valor do Fundo | A versão romana da mesma família. Algarismos firmes, que conversam com a gótica sem competir com ela |
| **Alegreya Sans** | Todo o texto e a interface | Sem serifa de raiz caligráfica, com um toque de manuscrito, muito legível em português. Contrasta com a gótica sem destoar |

**Escala** (a escala clássica de *The Elements of Typographic Style*):

| Token | Tamanho / entrelinha | Fonte | Uso |
|---|---|---|---|
| `display-xl` | 72 / 72 | Grenze 800 (timer) / Grenze Gotisch 800 (o nome Forja) | O tempo do timer; o nome na tela de entrar |
| `display-l` | 60 / 60 | Grenze Gotisch 800 | A letra da nota |
| `display-m` | 36 / 40 | Grenze 700 | Nível, valor do Fundo |
| `title` | 26 / 30 | Grenze Gotisch 700 | Títulos de região: "Hoje", "Chefe da semana 2" |
| `lead` | 18 / 27 | Alegreya Sans 500 | A frase de status do dia |
| `body` | 16 / 24 | Alegreya Sans 400 | Texto corrido e listas |
| `small` | 14 / 20 | Alegreya Sans 500 | Rótulos, legendas da barra |
| `micro` | 12 / 16 | Alegreya Sans 500 | Só os meses embaixo da barra |

**Regras de texto**
- Sempre em caixa normal de frase: nada de rótulo em maiúsculas.
- Nada de rótulo pequeno em cima de título.
- Nada de destacar uma palavra só dentro de um título.
- Algarismos alinhados e tabulares (`font-variant-numeric: lining-nums tabular-nums`) em tudo que muda: timer, minutos, R$, XP. Se a fonte não tiver `tnum`, o timer usa um `span` de largura fixa por dígito.
- A gótica é só para títulos curtos (até umas 5 palavras). Frases e números pequenos ficam sempre na Alegreya Sans.
- Linha de texto corrido com no máximo 72 caracteres.
- Carregar com `next/font/google`: Grenze Gotisch (700, 800), Grenze (700, 800) e Alegreya Sans (400, 500, 700). As três foram confirmadas no Google Fonts.

## 5. Layout

**Conceito:** o painel é lido de cima para baixo, na ordem das perguntas do dia. Grade de 12 colunas, conteúdo com até 1440 px, cartões separados por 20 px. A página rola: o que decide o dia fica na primeira dobra (1920 × 919), e o resto vem logo abaixo.

```
 Forja   Painel  Cursos                                   Usar folga (2)  [Registrar estudo]  ⋯
 ┌─ Hoje ─────────────────────────────────┐ ┌─ Chefe da semana 3 ─────────────┐
 │  ╭───╮  Faltam 25 min para a meta.     │ │ (retrato) Lich da Procrastinação │
 │ │35 │  [ Estudar agora ]  □ Pomodoro   │ │ vida ████████░░░  9 de 16        │
 │  ╰───╯  Próxima aula: Teste de carga    │ │ seg ter hoje qua … (livro,       │
 │ [martelo Academia  Marcar treino]       │ │  martelo e coração por dia)      │
 │ [coração Cardio    Marcar cardio]       │ │ Estudo 2 de 7  Academia 3 de 4 … │
 └─────────────────────────────────────────┘ └──────────────────────────────────┘
 ┌─ Operação Réveillon   Dia 17 de 80     (Sequência) (Escudos) (63 dias até 23/12) ─┐
 │ ▆▆▆▆▆ ▒▒ ▓▓▓▓▓ ░░░░░░░ … a barra de 80 dias …                                     │
 └─────────────────────────────────────────────────────────────────────────────────────┘
 ┌─ Personagem ────────┐ ┌─ Fundo Réveillon ───┐ ┌─ Nota prevista ──────┐
 │ (ferreiro) Nível 6  │ │ (bolsa) R$ 240      │ │ ┌╌╌┐ Estudo   ▬▬▬ 92% │
 │ XP ▬▬▬▬▬▬           │ │ ▬▬▬ de R$ 1.500     │ │ ╎A ╎ Academia ▬▬▬ 88% │
 │ Int / Força / Vigor │ │ [Marcar depositado] │ │ └╌╌┘ Cardio   ▬▬▬ 90% │
 └─────────────────────┘ └─────────────────────┘ └──────────────────────┘
 ┌─ Estudo dos últimos 14 dias ───────────┐ ┌─ Cursos ─────────────────────────┐
 │ colunas por dia com a linha da meta    │ │ (anel) curso atual, próxima aula │
 └────────────────────────────────────────┘ └──────────────────────────────────┘
 ┌─ Baús ──────────────────────────────────────────────────────────────────────────────┐
 │ (baú) Primeiro chefe   (baú) 21 dias   (baú) Metade com A   (baú) 50 h   (baú) Nota │
 └─────────────────────────────────────────────────────────────────────────────────────┘
```

- **Larguras na grade de 12:** Hoje 7 e chefe 5; temporada 12; personagem, Fundo e nota 4 cada; gráfico 7 e cursos 5; baús 12. Os cartões de uma mesma linha têm a mesma altura.
- **Mais estreito:** abaixo de 1024 px, tudo vira uma coluna, na mesma ordem. Os baús ficam em 3 colunas no tablet e em 2 no celular. No celular a barra vira uma grade de 4 linhas de 20 dias, e o gráfico desenha na largura real (o texto não encolhe).
- **Espaçamento:** múltiplos de 4. Dentro do cartão, 20 × 24 px de margem; entre cartões, 20 px.
- **Cantos:**
  - cartões, 14 px;
  - quadros internos (treino, cardio, depósito, baús, dias da semana), 10 px;
  - botões e campos, 6 px;
  - a barra, 10 px nas pontas.
- **Profundidade:** a barra mantém o brilho e a sombra de 1 px. Diálogos, gaveta e o menu "⋯" levam sombra. Cartões não levam sombra, só a borda.

## 6. Componentes

### Barra da temporada
- **Segmentos:** 80, um por dia, com 2 px entre eles e 8 px a mais a cada segunda-feira. O vão marca a semana, que é uma sequência de verdade.
- **Medidas:** em 1920 px, cada segmento tem cerca de 18 px de largura por 64 px de altura.
- **Cor:** cada segmento é pintado pela escala de calor da seção 3.
- **Hoje:** contorno de 2 px na cor Incandescente, com 2 px de afastamento, e a palavra "hoje" acima, em `small`.
- **Legendas:**
  - embaixo, os meses no primeiro dia de cada um, "metade" em 13/11 e "fim" em 23/12;
  - na ponta direita, "Réveillon em 28/12";
  - a semana atual leva "semana 2" embaixo do seu grupo.
- **Navegação:** cada segmento é um botão (navegação por setas, um só ponto de tabulação). Ao passar o mouse ou focar, mostra "seg, 12/10: 75 min de estudo, treino e cardio". O clique abre a gaveta do dia.
- **Leitor de tela:** cada segmento é lido como "12 de outubro, meta cumprida, 75 minutos, treino, cardio".

### Hoje
- **Título:** "Hoje, segunda, 12 de outubro" em `title`.
- **Status:** uma frase em `lead` que muda com o estado:
  - "Faltam 25 min para a meta de hoje."
  - "Meta de hoje cumprida. Cada minuto a mais vale XP até 2h."
  - "Ontem ficou sem estudo. Se hoje também ficar, a sequência quebra."
- **Trilho de minutos:** 12 marcas de 10 min. Até 60, preenchem em Brasa; de 60 a 120, em Palha. Um traço na marca de 60 com a palavra "meta". Ao lado, "35 de 60 min".
- **"Estudar agora":** botão principal, 56 px de altura, fundo Brasa, borda de 2 px em tinta ferrosa (como uma chapa quente), texto em tinta ferrosa, Alegreya Sans 700 de 18 px. Ao lado, "Próxima aula: Techspec e PRD (5 min)".
- **Ações secundárias:** "Marcar treino" e "Marcar cardio", botões com contorno de 1 px em tinta ferrosa e fundo transparente.
  - "Marcar cardio" abre um painel pequeno com a modalidade e os minutos. O app decide sozinho se é supercardio e diz isso antes de salvar ("Isto conta como supercardio").

### Timer (ocupa o lugar de "Hoje" enquanto roda)
- **Tempo:** `display-xl`, por exemplo "42:10", com algarismos tabulares e sem nenhuma animação.
- **Abaixo do tempo:** curso e aula, depois os botões "Pausar" e "Encerrar sessão".
- **Presença:** aos 50 min, aparece uma faixa na própria região, "Ainda estudando?", com o botão "Sim, continuar", e sai também a notificação do Windows.
- **Se o timer pausou sem resposta:** "O timer pausou às 15:40. Esse intervalo foi estudo?", com os botões "Contar 22 min" e "Não contar".
- **"Encerrar sessão"** abre um diálogo:
  - pergunta "Até qual aula você chegou?" e lista as próximas aulas, com a seguinte já marcada;
  - o botão é "Salvar sessão", e a confirmação diz "Sessão salva: 52 min, até a aula Techspec e PRD".

### Chefe da semana
- **Título:** "Chefe da semana 2".
- **Linhas:** três, uma por hábito, cada uma com o nome, "3 de 5" e marcadores quadrados: cheios para o que foi feito, vazios para o que falta.
- **Supercardio:** o marcador dele é um losango, para ser lido sem depender da cor.
- **Frase final:** o que falta ("Faltam 2 treinos e o supercardio.") ou a vitória ("Chefe derrotado: 1 escudo, 100 XP e R$ 30 no Fundo.").

### Personagem
- "Nível 4" em `display-m`, com o título "Malhador" ao lado em `lead`.
- **XP:** "1.240 de 1.500 XP" e um trilho fino de 6 px, preenchido em tinta ferrosa.
- **Atributos:** Inteligência, Força e Vigor, com nome, número e um trilho monocromático cada. Sem uma cor por atributo: a cor fica reservada ao calor, ao dinheiro e à proteção.
- **Escudos:** dois brasões (escudo heráldico), cheios em azul heráldico quando disponíveis e só em contorno quando não. Ao lado, "1 de 2".

### Nota prevista: a marca do ferreiro
- A letra em `display-l`, dentro de um quadro de 88 × 88 px, como a marca que o ferreiro punciona na peça pronta.
- **Nota prevista:** quadro com borda tracejada, porque a peça ainda não está pronta.
- **Nota final, em 23/12:** borda sólida e letra com leve baixo-relevo (`text-shadow` de 1 px claro embaixo).
- **Embaixo:** "Estudo 92%", "Academia 88%" e "Cardio 84%", com os números alinhados à direita.

### Fundo Réveillon
- **Valor:** "R$ 210" em `display-m`, na cor ouro velho, e "de R$ 1.500" em `body`, tom secundário.
- **Medidor:** trilho com preenchimento em ouro velho.
- **Depósito pendente:** "Depositar R$ 130 da semana 2", com o botão de contorno "Marcar como depositado". A confirmação diz "Depósito confirmado", e a semana ganha um pequeno selo de cera (a cor Cera) na lista de depósitos.
- **Cliente:** o link "Registrar cliente fechado" abre um campo para o valor do contrato e mostra o bônus antes de salvar.

### Cursos
- **Lista:** a fila na ordem, com o curso atual em Alegreya Sans 700 e os outros em 400. Cada curso tem um trilho de progresso em tinta ferrosa e a data "até 20/10".
- **Curso atual:** mostra também o módulo e a próxima aula.
- **Detalhe:** o link "Ver cursos" abre o mapa completo, com módulos numerados (eles são uma sequência), aulas, o que falta e a previsão.

### Baús
- **Linhas:** cinco, cada uma com o ícone, a condição e o prêmio, sempre visíveis.
- **Trancado:** baú com cintas de ferro e cadeado, em contorno, tom secundário.
- **Aberto:** tampa levantada, interior em Palha, e a frase "Aberto em 11/10".

### Gaveta do dia
- Abre pela direita ao clicar num segmento.
- Mostra:
  - o dia;
  - as sessões de estudo, com horários, minutos e aulas;
  - os treinos e cardios;
  - o calor do dia e o porquê;
  - o XP e os R$ que ele rendeu.
- Botão "Registrar para este dia", disponível só para hoje e ontem.

### Entrar
- Uma coluna estreita no meio, com o nome "Forja" em `display-xl` e uma barra pequena, estática, já com alguns segmentos aquecidos.
- Embaixo, o campo de senha e o botão "Entrar".
- Erro: "Senha incorreta. Confira e tente de novo."

### Ícones
- Desenhados para o Forja, em traço de 1,5 px, com silhueta medieval: brasão (escudo heráldico em forma de amêndoa), baú com cintas de ferro, bigorna, martelo, chama e selo de cera.
- Nada de emoji.
- Um ícone só aparece onde ajuda a reconhecer algo mais rápido. Nunca enfeita um título.

## 7. Movimento

Um único momento orquestrado, e o resto só responde ao que você faz.

1. **Aquecimento da barra:** acontece na primeira abertura de cada dia.
   - Os segmentos que já passaram vão de ferro frio à cor deles, da esquerda para a direita, com 8 ms entre um e outro e 240 ms cada, em menos de 1 s no total.
   - Depois, o segmento de hoje pulsa duas vezes e para.
   - Nas outras aberturas do dia, a barra aparece pronta.
2. **Martelada:** quando um registro muda o calor de hoje, o segmento afunda 2 px e volta em 160 ms, e a cor nova entra em 300 ms.
3. **Faíscas:** só ao bater a meta de 60 min ou derrotar o chefe. São até 6 pontos de 2 px, em Palha e Incandescente, subindo por 500 ms.
4. **Botões:** ao apertar, descem 1 px. Ao passar o mouse, só o fundo escurece um tom. Sem crescer, flutuar ou brilhar.
5. **Com `prefers-reduced-motion`:** nada se move. As cores mudam direto.

## 8. Texto na interface

- Português do Brasil, falando com "você", em caixa normal de frase, com verbos simples.
- **O botão diz o que acontece, e a confirmação repete o mesmo verbo:**

| Botão | Confirmação |
|---|---|
| Estudar agora | (a região vira o timer) |
| Encerrar sessão, depois Salvar sessão | Sessão salva: 52 min |
| Marcar treino | Treino marcado |
| Marcar cardio | Cardio marcado ou Supercardio marcado |
| Usar folga | Folga marcada para hoje |
| Marcar como depositado | Depósito confirmado |
| Registrar cliente fechado | Bônus de R$ 150 somado ao Fundo |

- **Erro** diz o que aconteceu e o que fazer, sem pedir desculpas: "Sem conexão com o servidor. O treino não foi salvo; tente de novo."
- **Tela vazia** convida a agir: "Nenhum estudo hoje ainda. Comece pela aula Techspec e PRD."
- **Proibido:**
  - maiúsculas em rótulo;
  - ponto do meio juntando informações ("A · B · C");
  - "PALAVRA — complemento";
  - seta "→" em botão ou link;
  - fonte monoespaçada para números pequenos.

## 9. Acessibilidade (o mínimo, sempre)

- Contraste AA em todo texto (as razões estão nos tokens). Componentes e ícones com pelo menos 3:1.
- Foco visível em tudo: contorno de 2 px em azul heráldico, afastado 2 px.
- A escala de calor nunca depende só da cor:
  - a luminância sobe de forma contínua;
  - a folga tem listras e o escudo tem faixa;
  - o texto do segmento (dica e leitor de tela) diz o estado.
- Tudo funciona pelo teclado, inclusive a barra (setas) e os diálogos (Esc fecha, o foco volta para onde estava).
- Movimento reduzido respeitado.

## 10. Revisão contra o genérico

Depois do primeiro plano, comparei cada escolha com o que sairia para qualquer app de hábitos ou painel gamificado. Isto mudou:

| Primeiro plano | Problema | Ficou assim |
|---|---|---|
| Mapa de calor em grade, estilo GitHub (7 × 12) | É o padrão de todo app de hábitos e não diz nada sobre forja | A barra de 80 segmentos: uma peça só, lida da esquerda para a direita, com as semanas marcadas por vãos |
| Tema escuro principal, com laranja de destaque | Cai no clichê de fundo quase preto com um acento vivo, e o seu Windows está no tema claro | Tema claro principal. A barra é o único objeto escuro, e o laranja é um degrau de uma escala que codifica dados |
| Blocos de número grande com rótulo pequeno (nível, XP, R$) | Bloco de estatística padrão de painel | Os números aparecem em frases ("R$ 210 de R$ 1.500"). O único número que é desenho é a letra da nota, como marca de ferreiro |
| Uma cor por atributo (azul, vermelho, verde) | Arco-íris de painel de jogo, que dilui o significado das cores | Atributos em uma cor só. Cor fica para calor, dinheiro e proteção |
| Cartões arredondados com sombra para cada bloco | Kit de cartões de SaaS | Sem caixas. As regiões se separam por espaço; só a barra, a marca e o timer têm material |
| Grotesca industrial (Big Shoulders) e fundo de zinco | O usuário pediu ambientação medieval de RPG; o pedido do cliente vence | Grenze Gotisch nos títulos, pergaminho e fuligem nos fundos. Evitei a Cinzel e a MedievalSharp, que são o clichê medieval mais batido, e as fraktur ilegíveis |
| Confete e troféu ao bater meta | Celebração genérica | Faíscas pequenas, só nos dois momentos que importam |

## 11. Para quem for implementar (inclusive agentes do spec-kit)

- Leia a seção 2 antes de criar qualquer tela. Se um componente novo precisar de cor, ela vem dos papéis da seção 3; se nenhum servir, a cor é tinta ferrosa ou pergaminho.
- Não crie cartões, sombras ou degradês para separar regiões. Use espaço.
- Toda cópia de interface segue a seção 8. Na dúvida, escreva o que o botão faz.
- Antes de dar uma tela por pronta:
  - tire um print em 1920 × 919 no tema claro e outro em 375 px de largura;
  - confira se a barra, "Hoje" e o chefe aparecem sem rolar no primeiro tamanho;
  - tire um acessório.

## 12. Notas para as próximas rodadas

- **Revisão 2:** os chefes são 6 retratos (ogro, goblin, lich, troll, serpente, dragão) com 12 nomes, em `src/components/bosses.ts`. São só visuais: as regras do chefe vêm do motor.

- O visual da barra ainda não foi visto por você. O protótipo é o lugar de reagir: altura dos segmentos, intensidade das cores, quantidade de legenda.
- Se a barra parecer pesada demais no tema claro, a primeira coisa a testar é diminuir a altura para 48 px, antes de mexer nas cores.
- Ideia guardada para a Temporada 2: a barra concluída de uma temporada vira uma "peça" no histórico, com a marca da nota final.
