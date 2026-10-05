# Forja

Livro de registros de uma forja medieval: um app pessoal, com cara de RPG, para manter três hábitos até 23/12/2026.

- **Estudo:** pelo menos 1h por dia de videoaula dos cursos da fila.
- **Academia:** 4 treinos por semana.
- **Cardio:** 5 por semana, com pelo menos um supercardio.

Cada dia cumprido aquece um segmento da barra da temporada. O esforço vira XP, nível e títulos de ferreiro; o chefe da semana dá escudos; o Fundo Réveillon junta o dinheiro da viagem; os baús guardam os prêmios.

**Temporada 1: Operação Réveillon**, de 05/10/2026 a 23/12/2026.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [specs/001-forja-temporada-1/spec.md](specs/001-forja-temporada-1/spec.md) | O que o app faz: histórias, regras e critérios |
| [specs/001-forja-temporada-1/plan.md](specs/001-forja-temporada-1/plan.md) | Como foi construído |
| [specs/001-forja-temporada-1/data-model.md](specs/001-forja-temporada-1/data-model.md) | Dados guardados e regras de cálculo |
| [specs/001-forja-temporada-1/tasks.md](specs/001-forja-temporada-1/tasks.md) | Tarefas de implementação |
| [DESIGN.md](DESIGN.md) | Sistema visual |
| [src/config/season1.ts](src/config/season1.ts) | Todas as regras numéricas da temporada (metas, XP, valores, baús) |

## Rodar no PC

Precisa do Node 20 ou mais novo.

```bash
npm install
cp .env.example .env.local
npm run dev
```

No `.env.local`, defina `FORJA_PASSWORD` (a senha de entrada), `FORJA_SECRET` e `FORJA_STATUS_TOKEN` (textos aleatórios longos). Depois abra http://localhost:3000.

- Sem `DATABASE_URL`, os dados ficam em `.data/forja.json`.
- Para ver o painel no meio da temporada antes de 05/10, use `FORJA_NOW=2026-10-21T15:00:00-03:00`. Só funciona em desenvolvimento.

```bash
npm test        # regras do jogo
npm run lint
npm run build
```

## Publicar na Vercel

1. Crie o projeto na Vercel importando este repositório.
2. Em **Storage**, adicione o **Neon** (plano gratuito). A Vercel cria a variável `DATABASE_URL`.
3. Em **Settings → Environment Variables**, defina `FORJA_PASSWORD`, `FORJA_SECRET` e `FORJA_STATUS_TOKEN`.
4. Crie as tabelas uma vez, com a `DATABASE_URL` do Neon no `.env.local`:

   ```bash
   npm run db:setup
   ```

5. Faça o deploy e entre com a senha.

## Abrir sozinho todo dia (Windows)

Os scripts em [scripts/windows](scripts/windows) registram duas tarefas no Agendador do Windows:

- uma abre o Forja no Chrome no primeiro uso do PC depois das 04:00;
- a outra, às 21h, abre de novo se o estudo do dia não foi feito ou se a semana corre risco.

As instruções estão em [scripts/windows/README.md](scripts/windows/README.md).

## Pixel art

Os desenhos ficam em `public/pixel/`.

- **Personagem (6 evoluções) e chefes (12):** ilustrações geradas por IA, em PNG de 256 × 256 com fundo transparente.
- **Baús, bolsa e ícones:** pixel art gerada por `scripts/pixel/build.py` com a skill `pixel-art-gen`. Os PNG já estão no git; só é preciso rodar de novo para mudar algum desses desenhos:

```bash
python scripts/pixel/build.py             # tudo
python scripts/pixel/build.py bau icone   # só o que começa com esses nomes
```

Precisa de Python com Pillow e do renderizador da skill em `~/.claude/skills/pixel-art-gen` (ou em `PIXEL_ART_RENDERER`).

O mapa é uma ilustração (`public/pixel/mapa.webp`). A estrada, os chefes e os baús ficam por cima, nas posições de `src/config/mapa.json`, que foram marcadas sobre essa imagem. Se trocar a imagem, essas posições precisam ser marcadas de novo.

## Como funciona por dentro

- **Next.js 16** (App Router) com Server Actions, **Tailwind 4** e **Postgres no Neon**. São só duas tabelas: `records` e `kv`.
- **Nada do jogo é guardado:** sequência, escudos, chefes, XP, nota, Fundo, baús e previsões são calculados a cada carregamento por funções puras em `src/lib/game/`, a partir dos registros. Mudar uma regra em `season1.ts` recalcula a temporada inteira.
- **O dia vira às 04:00** no horário de Brasília.
- **O catálogo dos cursos** (`src/config/courses.json`) foi lido da plataforma da Pythonando em 03/10/2026.
