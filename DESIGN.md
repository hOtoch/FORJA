# Forja: design

Sistema visual do Forja. Escrito com a skill `frontend-design`, antes de qualquer tela existir. Vale para o protótipo e para o app. Quando um componente novo surgir, ele segue estas regras ou este documento muda primeiro.

---

## 1. Assunto, público e função

- **Assunto:** uma forja. Você aquece e martela o mesmo metal todo dia até ele virar uma peça. Cada dia de estudo e treino é uma martelada na barra da temporada.
- **Público:** uma pessoa só, desenvolvedor e freelancer, que abre o app todo dia no Chrome de um PC com tela de 1920 × 1080 e Windows no tema claro.
- **Função principal:** em cinco segundos, mostrar o que falta hoje e como vai a temporada, e levar ao clique em "Estudar agora".

O vocabulário visual sai do ofício do ferreiro: o metal frio, a escala de cores do metal aquecido, o azul que o aço ganha ao ser temperado, o latão das moedas e a marca que o ferreiro punciona na peça pronta.

## 2. Princípios

1. **A barra é a tela.** A temporada é uma barra de ferro com 80 segmentos, um por dia. É o único objeto escuro e com material numa página clara e quieta. Toda a ousadia do design fica nela.
2. **Calor é informação.** As cores do metal aquecido marcam trabalho feito e nunca servem de enfeite. Laranja quer dizer "você esquentou o metal", não "cor da marca".
3. **Metal frio, não vergonha.** Um dia sem estudo aparece como ferro frio, cinza e sem brilho. Não há vermelho de erro, alerta ou culpa.
4. **Uma próxima ação, dita em palavras simples.** A página sempre deixa claro o próximo passo: "Estudar agora", "Marcar treino".
5. **Silêncio em volta.** As regiões são texto bem hierarquizado sobre o fundo, sem caixas, sombras ou degradês. Só a barra, a marca da nota e o timer têm tratamento de material.

## 3. Cor

### Paleta base

| Nome | Hex | Papel |
|---|---|---|
| Aço | `#1D242B` | Texto no tema claro, fundo no escuro e o metal da barra |
| Zinco | `#ECEFF2` | Fundo no tema claro, texto no escuro |
| Ferro frio | `#6B7782` | Dias sem estudo, ícones inativos. Não serve para texto pequeno no tema claro |
| Brasa | `#E8681E` | Calor e a ação principal ("Estudar agora") |
| Latão | `#7A5C14` | Dinheiro: o Fundo Réveillon e os depósitos |
| Revenido | `#2F5FB8` | Foco do teclado, links e escudos. É o azul de revenimento, a cor que o aço ganha ao ser temperado |

### Escala de calor (só na barra e no progresso de hoje)

A escala segue as cores reais do metal aquecido. A luminância sobe de forma contínua, então a ordem continua legível para quem não distingue cores.

| Nível | Nome | Hex | Quando aparece |
|---|---|---|---|
| — | Por forjar | `#232A31` com contorno `#333C45` | Dia futuro |
| 0 | Ferro frio | `#3B4550` | Dia que passou sem a meta de estudo |
| 1 | Cereja | `#A3311F` | Estudou, mas menos de 60 min |
| 2 | Brasa | `#E8681E` | Meta de estudo cumprida |
| 3 | Palha | `#F3B54A` | Meta de estudo e mais 1 ponto de calor |
| 4 | Incandescente | `#FFF0CC` | Meta de estudo e mais 2 pontos de calor ou mais |

**Pontos de calor do dia:** 120 min de estudo valem 1 ponto, um treino vale 1 e um cardio vale 1.

**Marcas especiais nos segmentos:**
- **Folga:** listras diagonais em `#3B4550` sobre `#232A31`.
- **Dia salvo por escudo:** ferro frio, com uma faixa de 3 px em Revenido no topo.

### Tokens

```css
:root {
  --bg: #ECEFF2;            /* Zinco */
  --surface: #F7F8FA;       /* campos, diálogos */
  --text: #1D242B;          /* Aço */
  --text-muted: #56616C;    /* 5,5:1 sobre o fundo */
  --line: #C9D0D6;          /* só onde a linha separa dados */
  --cta: #E8681E;           /* Brasa */
  --cta-text: #1D242B;      /* 4,8:1 sobre a Brasa */
  --focus: #2F5FB8;         /* Revenido, 5,3:1 */
  --money: #7A5C14;         /* Latão, 5,4:1 */
  --track: #D5DBE0;         /* trilhos de medidores */

  /* a barra é sempre escura, nos dois temas */
  --bar: #151A1F;
  --heat-future: #232A31;
  --heat-future-line: #333C45;
  --heat-0: #3B4550;
  --heat-1: #A3311F;
  --heat-2: #E8681E;
  --heat-3: #F3B54A;
  --heat-4: #FFF0CC;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #1B2128;
    --surface: #232A32;
    --text: #E3E8EC;
    --text-muted: #9AA6B1;   /* 6,5:1 */
    --line: #3A444F;
    --focus: #7FA6EE;        /* 6,4:1 */
    --money: #D4AC4F;        /* 7,4:1 */
    --track: #2C343C;
    --bar: #11161A;
  }
}

:root[data-theme="dark"] { /* mesmos valores do bloco acima */ }
```

O tema segue o Windows por padrão. Hoje o Windows está no tema claro, então ele é o principal; o escuro tem que funcionar, mas é variante.

### Regras de uso

- **Brasa:** só para calor (barra, progresso de hoje) e para o botão "Estudar agora". Nunca como cor de texto no tema claro, porque o contraste não basta.
- **Latão:** só para dinheiro.
- **Revenido:** só para foco, links e escudos.
- **Todo o resto:** Aço e Zinco, com o tom secundário.
- **Nenhum degradê** em lugar nenhum.

## 4. Tipografia

| Família | Papel | Por quê |
|---|---|---|
| **Big Shoulders Display** | Números grandes, títulos de região, a marca da nota, o nome Forja | Grotesca condensada nascida da sinalização industrial de Chicago. Tem cara de oficina e de placa de metal, com algarismos altos que funcionam no timer |
| **Barlow** | Todo o texto e a interface | Grotesca de sinalização rodoviária, levemente arredondada, muito legível em português. É bem mais larga que a Big Shoulders, então as duas não se confundem |

**Escala** (a escala clássica de *The Elements of Typographic Style*):

| Token | Tamanho / entrelinha | Fonte | Uso |
|---|---|---|---|
| `display-xl` | 72 / 72 | Big Shoulders 800 | O tempo do timer; o nome Forja na tela de entrar |
| `display-l` | 60 / 60 | Big Shoulders 800 | A letra da nota |
| `display-m` | 36 / 40 | Big Shoulders 700 | Nível, valor do Fundo |
| `title` | 24 / 28 | Big Shoulders 700 | Títulos de região: "Hoje", "Chefe da semana 2" |
| `lead` | 18 / 27 | Barlow 500 | A frase de status do dia |
| `body` | 16 / 24 | Barlow 400 | Texto corrido e listas |
| `small` | 14 / 20 | Barlow 500 | Rótulos, legendas da barra |
| `micro` | 12 / 16 | Barlow 500 | Só os meses embaixo da barra |

**Regras de texto**
- Sempre em caixa normal de frase: nada de rótulo em maiúsculas.
- Nada de rótulo pequeno em cima de título.
- Nada de destacar uma palavra só dentro de um título.
- Algarismos tabulares (`font-variant-numeric: tabular-nums`) em tudo que muda: timer, minutos, R$, XP.
  - Confirmar na implementação se a Big Shoulders tem `tnum`. Se não tiver, o timer usa um `span` de largura fixa por dígito.
- Linha de texto corrido com no máximo 72 caracteres.
- Carregar com `next/font/google`: Big Shoulders Display (600, 700, 800) e Barlow (400, 500, 600).

## 5. Layout

**Conceito:** uma bancada. No alto, a barra da temporada ocupa toda a largura, como o metal sobre a bigorna. Logo abaixo, a região "Hoje" fica do lado do chefe da semana. Por último, uma faixa baixa com o resto do jogo. Tudo alinhado à esquerda, numa grade de 12 colunas. Os números ficam alinhados à direita quando estão em coluna.

**Painel em 1920 × 919, sem rolagem:**

```
 Forja                                                     Registrar   Cursos   Fundo   Histórico
 Temporada 1: Operação Réveillon                                        Dia 12 de 80, faltam 69
 ╭──────────────────────────────────────────────────────────────────────────────────────────────╮
 │ ▆▆▆▆▆ ▆▆▒▒ ▓░▓▓▓▓▓ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░░░░░ ░░░ │
 ╰──────────────────────────────────────────────────────────────────────────────────────────────╯
   outubro                     novembro          metade                 dezembro    fim, Réveillon em 28/12

 Hoje, segunda, 12 de outubro                          Chefe da semana 2
 Faltam 25 min para a meta de hoje.                    Estudo     3 de 5 dias   ■■■□□
 ▰▰▰▱▱▱│▱▱▱▱▱▱   35 de 60 min                          Academia   2 de 4        ■■□□
 [ Estudar agora ]  Próxima aula: Techspec e PRD (5 min)   Cardio     3 de 5        ■■■□◇
 Marcar treino     Marcar cardio                       Faltam 2 treinos e o supercardio.

 Nível 4            Nota prevista     Fundo Réveillon      Cursos                     Baús
 Malhador           ┌╌╌╌╌╌┐           R$ 210               Desenvolvimento assist.   ▢ Primeiro chefe
 1.240 de 1.500 XP  ╎  A  ╎           de R$ 1.500          ▰▰▰▱▱▱  até 20/10         ▢ 21 dias seguidos
 Inteligência  620  └╌╌╌╌╌┘           ▰▰▱▱▱▱▱▱▱▱           Python Full AI (prof.)    ▢ Metade com A
 Força         360  Estudo     92%    Depositar R$ 130     ▱▱▱▱▱▱  até 13/11         ▢ 50 horas
 Vigor         260  Academia   88%    da semana 2          Python Full AI (acad.)    ▢ Nota em 23/12
 Escudos  ◆ ◇       Cardio     84%    Marcar como depositado  ▱▱▱▱▱▱  até 02/12
```

- **Larguras:** conteúdo com até 1680 px e margens laterais de 120 px em 1920. A barra usa a largura toda. "Hoje" ocupa 7 colunas e o chefe, 5. A faixa de baixo tem 5 regiões de largura igual.
- **Alturas aproximadas:** cabeçalho 48, barra com legendas 128, linha do meio 280, faixa de baixo 260, mais os espaços. Cabe em 919 px.
- **Mais estreito:**
  - de 1024 a 1439 px, a faixa de baixo quebra em 3 + 2;
  - de 768 a 1023 px, tudo fica em duas colunas;
  - abaixo de 768 px, é uma coluna só, e a barra vira uma grade de 4 linhas de 20 dias.
- **Espaçamento:** múltiplos de 4, na série 4, 8, 12, 16, 24, 32, 48, 64. Regiões separadas por 32 ou 48 px de ar, não por linhas.
- **Cantos:**
  - a barra tem 10 px nas pontas, como um lingote;
  - segmentos, 2 px;
  - botões e campos, 6 px;
  - a marca da nota, 8 px;
  - as regiões não têm caixa, então não têm canto.
- **Profundidade:** só três coisas têm sombra.
  - A barra: um brilho de 1 px no alto (`rgba(255,255,255,.06)`) e uma sombra de 1 px embaixo (`rgba(0,0,0,.35)`).
  - Diálogos e a gaveta do dia: `0 16px 48px rgba(16,22,28,.28)`.
  - Mais nada.

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
- **"Estudar agora":** botão principal, 56 px de altura, fundo Brasa, texto Aço em Barlow 600 de 18 px. Ao lado, "Próxima aula: Techspec e PRD (5 min)".
- **Ações secundárias:** "Marcar treino" e "Marcar cardio", botões com contorno de 1 px em Aço e fundo transparente.
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
- **XP:** "1.240 de 1.500 XP" e um trilho fino de 6 px, preenchido em Aço.
- **Atributos:** Inteligência, Força e Vigor, com nome, número e um trilho monocromático cada. Sem uma cor por atributo: a cor fica reservada ao calor, ao dinheiro e à proteção.
- **Escudos:** dois ícones de escudo, cheio em Revenido quando disponível e vazio quando não. Ao lado, "1 de 2".

### Nota prevista: a marca do ferreiro
- A letra em `display-l`, dentro de um quadro de 88 × 88 px, como a marca que o ferreiro punciona na peça pronta.
- **Nota prevista:** quadro com borda tracejada, porque a peça ainda não está pronta.
- **Nota final, em 23/12:** borda sólida e letra com leve baixo-relevo (`text-shadow` de 1 px claro embaixo).
- **Embaixo:** "Estudo 92%", "Academia 88%" e "Cardio 84%", com os números alinhados à direita.

### Fundo Réveillon
- **Valor:** "R$ 210" em `display-m`, na cor Latão, e "de R$ 1.500" em `body`, tom secundário.
- **Medidor:** trilho com preenchimento em Latão.
- **Depósito pendente:** "Depositar R$ 130 da semana 2", com o botão de contorno "Marcar como depositado". A confirmação diz "Depósito confirmado".
- **Cliente:** o link "Registrar cliente fechado" abre um campo para o valor do contrato e mostra o bônus antes de salvar.

### Cursos
- **Lista:** a fila na ordem, com o curso atual em Barlow 600 e os outros em 400. Cada curso tem um trilho de progresso em Aço e a data "até 20/10".
- **Curso atual:** mostra também o módulo e a próxima aula.
- **Detalhe:** o link "Ver cursos" abre o mapa completo, com módulos numerados (eles são uma sequência), aulas, o que falta e a previsão.

### Baús
- **Linhas:** cinco, cada uma com o ícone, a condição e o prêmio, sempre visíveis.
- **Trancado:** ícone em contorno, tom secundário.
- **Aberto:** ícone preenchido em Palha e a frase "Aberto em 11/10".

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
- Desenhados para o Forja, em traço de 1,5 px: escudo, baú, bigorna, chama.
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
- Foco visível em tudo: contorno de 2 px em Revenido, afastado 2 px.
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
| Fonte medieval de RPG (tipo Cinzel) | Clichê de fantasia, e o assunto é oficina, não castelo | Big Shoulders, de origem industrial |
| Confete e troféu ao bater meta | Celebração genérica | Faíscas pequenas, só nos dois momentos que importam |

## 11. Para quem for implementar (inclusive agentes do spec-kit)

- Leia a seção 2 antes de criar qualquer tela. Se um componente novo precisar de cor, ela vem dos papéis da seção 3; se nenhum servir, a cor é Aço ou Zinco.
- Não crie cartões, sombras ou degradês para separar regiões. Use espaço.
- Toda cópia de interface segue a seção 8. Na dúvida, escreva o que o botão faz.
- Antes de dar uma tela por pronta:
  - tire um print em 1920 × 919 no tema claro e outro em 375 px de largura;
  - confira se a barra, "Hoje" e o chefe aparecem sem rolar no primeiro tamanho;
  - tire um acessório.

## 12. Notas para as próximas rodadas

- O visual da barra ainda não foi visto por você. O protótipo é o lugar de reagir: altura dos segmentos, intensidade das cores, quantidade de legenda.
- Se a barra parecer pesada demais no tema claro, a primeira coisa a testar é diminuir a altura para 48 px, antes de mexer nas cores.
- Ideia guardada para a Temporada 2: a barra concluída de uma temporada vira uma "peça" no histórico, com a marca da nota final.
