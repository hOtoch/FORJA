# Quickstart: validar o Forja

## Pré-requisitos

- Node 20 ou mais novo (o PC tem o 24).
- Para publicar: conta na Vercel com o Neon ligado (fica com o usuário).

## Rodar no PC, sem banco

```bash
npm install
cp .env.example .env.local     # define FORJA_PASSWORD, FORJA_SECRET e FORJA_STATUS_TOKEN
npm run dev                    # http://localhost:3000
```

Sem `DATABASE_URL`, os dados ficam em `.data/forja.json`.

Para ver o painel "no meio da temporada" antes de 05/10, defina `FORJA_NOW=2026-10-21T15:00:00-03:00` no `.env.local`. O relógio do app passa a usar esse instante (só em desenvolvimento).

## Testes das regras

```bash
npm test
```

**Esperado:** todos os cenários passam, incluindo:

- temporada perfeita: Fundo R$ 1.500, nota S, 12 chefes;
- teto de 120 XP de estudo por dia;
- escudo usado num dia e sequência quebrada no segundo dia seguido;
- semana com dia salvo por escudo não derrota o chefe;
- depósito da semana do exemplo do spec: R$ 130;
- supercardio por modalidade e minutos;
- virada do dia às 04:00.

## Validação manual (cenários do spec)

1. **Entrar:** abra `/`, confira o redirecionamento para `/entrar` e entre com a senha. Feche e reabra o navegador: continua conectado.
2. **Estudar (US1):**
   - clique em "Estudar agora": a aula seguinte abre em nova aba e o timer corre;
   - feche a aba do Forja e reabra: o timer continua;
   - clique em "Encerrar sessão" e confirme a aula: os minutos de hoje e a próxima aula mudam.
3. **Treino e cardio (US2):**
   - "Marcar treino" passa a semana para 1 de 4;
   - um cardio de bicicleta de 60 min avisa "Isto conta como supercardio";
   - uma caminhada de 15 min é recusada.
4. **Painel em 1920 × 919:** a barra, "Hoje", o chefe, o personagem, a nota, o Fundo, os cursos e os baús aparecem sem rolar. Em 375 px, tudo fica em uma coluna.
5. **Tema:** troque o Windows para o tema escuro e confira que o Forja acompanha.
6. **Status:**
   ```bash
   curl -H "Authorization: Bearer $FORJA_STATUS_TOKEN" http://localhost:3000/api/status
   ```
   O JSON tem `studyDone`, `weekAtRisk` e `reasons`.
7. **Exportar:** pelo menu, baixe o JSON com todos os registros.

## Publicar na Vercel

1. Crie o projeto na Vercel a partir do repositório, adicione o Neon pelo Marketplace (a Vercel cria `DATABASE_URL`) e defina `FORJA_PASSWORD`, `FORJA_SECRET` e `FORJA_STATUS_TOKEN`.
2. Rode `npm run db:setup` uma vez, com a `DATABASE_URL` do Neon, para criar as tabelas.
3. Abra a URL publicada e repita os passos 1 a 3 acima.

## Windows

```powershell
cd scripts\windows
copy forja.config.example.json forja.config.json   # preencha url e statusToken
powershell -ExecutionPolicy Bypass -File .\instalar.ps1
```

Confira no Agendador de Tarefas a pasta `Forja` com "Abrir" e "Lembrete". Para remover, rode `desinstalar.ps1`.
