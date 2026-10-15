# QuestCity

Mobile-first PWA for creating and completing city quests.

## Render deployment

The root `Dockerfile` and `render.yaml` deploy the frontend and API together with
managed PostgreSQL. See [deployment instructions and free-plan limits](docs/render-deployment.md).

## Local development

1. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
2. Run:

```bash
docker compose up --build
```

The services are available at:

- frontend: http://localhost:5173
- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs

The public homepage is a landing page with section anchors and a sign-in button.
The demo route uses OpenStreetMap and does not need a map API key.

## Implemented flow

The current vertical slice supports:

1. Register or sign in.
2. Create a quest draft.
3. Add ordered checkpoints with coordinates, activation radius and a task.
4. Submit the quest for admin review; approved quests enter the catalog.
5. Start a game session.
6. Follow a location clue, open short facts on the way, and view the exact point on a map.
7. Open the question without GPS for classroom demonstrations.
8. Submit answers to unlock the next clue and receive points.
9. Complete the route and see the final reward if the score requirement is met.

Text and single-choice tasks are supported. Answer comparison ignores case, extra spaces and the `е`/`ё` distinction.

Each checkpoint can also contain a post-answer reveal card with text, an image, audio,
a media caption and a source link. Authors upload files from the quest builder; local media
is stored in a persistent Docker volume and is shown only after the checkpoint is completed.

## Checks

```bash
docker compose run --rm backend pytest
docker compose run --rm backend ruff check .
docker compose run --rm frontend npm run build
```

## Demo quest: Taganrog

After creating the first user, add the demo route with this idempotent command:

```bash
docker compose exec backend python -m scripts.seed_taganrog
```

Local development temporarily allows checkpoints to be unlocked without GPS. Use
`ALLOW_LOCATION_BYPASS=false` to disable this mode.

The seeded Taganrog quest has four single-choice questions, four clues, two travel facts per leg, historical reveal cards,
and a sample reward for scores of at least 300. `TAGANROG-DEMO` is a teaching example and
cannot be redeemed at a real venue. When the local integration account exists, the seed
grants it the admin role so `/admin` can review submitted quests and configure rewards.

The exact point uses an OpenStreetMap embed and link. The map requires internet access;
gameplay and scoring do not require GPS. Reward codes are currently shared per quest:
production use needs unique code allocation and redemption tracking.

## Quest generator (Starimg)

Authors open `/quests/new/generate` from the creation page. Answers are saved
locally per user in this browser. After reviewing the questionnaire, generation
uses the server-side OpenAI-compatible Chat Completions client. The default
provider is `https://ai.starimg.ru/v1` and the model id is `gpt-6-luna` (the
`starimg/` prefix in OpenCode identifies its provider, not the direct API model id).
No OpenCode configuration or vendor script is needed for QuestCity.

Put the real key into `.env` in the project root:

```dotenv
LLM_API_KEY=your-real-key
LLM_BASE_URL=https://ai.starimg.ru/v1
LLM_MODEL=gpt-6-luna
LLM_TIMEOUT_SECONDS=120
LLM_MAX_TOKENS=16000
```

The included `.env` has an empty key. It is ignored by Git. The backend reads
this file for native runs; Compose forwards these settings to the backend only.
Never use a `VITE_` prefix for the key. Recreate/rebuild services after changing it:

```bash
docker compose up -d --build
```

Backend startup runs the migration adding `quests.generation_plan`. For native
backend execution, run `alembic upgrade head` from `backend` and restart Uvicorn.
`httpx` is a runtime dependency.

Authenticated endpoints:

- `GET /api/v1/quest-generation/status`: configured availability and model (no key).
- `POST /api/v1/quest-generation/prepare`: validates the questionnaire; returns
  `ready` when a key is set, otherwise `awaiting_provider`.
- `POST /api/v1/quest-generation/generate`: sends the brief to the LLM, validates
  the complete JSON response, and saves an author-owned draft with a generated plan.

A missing key, timeout, rate limit or malformed response creates no quest.
There are no automatic paid retries. The frontend waits for the generation result
and opens the draft in the builder. Availability means the key is configured, not
that a paid provider call has already succeeded. Real provider access must still
be verified with a valid key.

The generated plan contains places, tasks, clues, facts and verification notes.
It is visible only in author responses, not the public checkpoint preview. It has
no coordinates: selecting a suggestion fills the builder form, and the author
must supply real coordinates and review the content before adding the point.
`POST /quests/{id}/checkpoints?generation_index=N` records that confirmation in the
same transaction as adding the checkpoint. Reusing a confirmed suggestion is
rejected, and all suggestions must be added before submitting the quest for review.
Existing admin moderation still applies.

The in-flight guard prevents overlapping requests per author within a single
backend process. Multi-worker deployments need a shared job/idempotency store.


### AI suggestions for individual author fields

The creation form, generation questionnaire and checkpoint builder show a ✨
button next to every content field, number, selection and route preference.
Clicking it requests an individual suggestion using the current form context.
Authors can preview it, provide a short instruction, request another variant and
apply it explicitly. Closing the dialog leaves the form unchanged. Applying a
suggestion does not save or publish a quest.

Authenticated `POST /api/v1/quest-generation/suggest-field` validates the supported
field, context keys, size and returned value (text limits, enums, numbers, booleans,
answer choices and fact format). It uses the configured LLM on the server and
shares the per-user in-flight guard with full generation. Coordinate buttons ask
for real map coordinates; source URLs must come from the author's supplied
materials, and empty source notes are not invented. File attachments and the
confirmation that the author reviewed a point remain manual actions.

## Player adventure and places along the route

Quest detail pages display a live Leaflet/OpenStreetMap map of the start and
curated stops. Only the first checkpoint location is exposed in the preview;
future questions and locations remain hidden. Gameplay shows the current clue,
question, attempt counter, score, revealed facts, map and a journal of completed
chapters. The journal survives reloads and remains visible on completion.
Starting an unfinished quest resumes the existing session. Session mutations use
row locks to serialize attempts and prevent concurrent duplicate scoring.

`quests.partner_places` stores curated coffee/food/rest locations. Candidates are
shown as ordinary rest stops; only records explicitly marked as confirmed
partners may show a partner offer. Inactive places are hidden from player
responses. Admins manage each quest's places from its review page via
`GET/PUT /api/v1/admin/quests/{id}/partners`. Authors cannot grant partner status.
Places without coordinates have address cards but no map pin. Distances shown
are straight-line estimates from the current point, not walking distances or
live navigation times. A rest stop never advances or resets the game.

Migration: `20261014_0006`. `python -m scripts.seed_taganrog_places` idempotently
adds Old School Coffee (Петровская, 9/11) and Фрекен Бок (Тургеневский, 24) as
candidates to existing Taganrog quests. It does not overwrite admin edits or
invent discounts, contracts, ratings or opening hours. Public venue sources:
[Old School card](https://yandex.com/maps/org/old_school_coffee/170881226404/),
[Фрекен Бок official site](https://www.frekenbok-cafe.ru/) and
[coordinates](https://ru.aroundus.com/p/12478768-freken-bok).

Map tiles use the public OpenStreetMap service with visible attribution and no
bulk download/offline precaching. `VITE_MAP_TILE_URL` can point to another
compatible tile service; if changing providers, also update the attribution in
`AdventureMap.tsx`. Production traffic needs an appropriate tile-service plan.
# Новые игровые механики

В конструкторе доступны текстовый ответ, выбор варианта, фотозагадка и восстановление
последовательности. Для фотозагадки автор загружает изображение; ответ может быть
текстовым или с вариантами. Для последовательности строки задаются в правильном
порядке, игрок получает перемешанные элементы и переставляет их кнопками ↑/↓.

У точки можно добавить до трёх подсказок и указать стоимость каждой. Открытие
подсказки уменьшает потенциальную награду только этой точки, не затрагивая уже
заработанные баллы. Стоимость показана перед подтверждением, открытые подсказки
сохраняются на сервере. Повторный запрос той же подсказки не увеличивает списание.

В конструкторе настраивается проводник: капитан, хранитель историй или исследователь,
его имя, приветствие и финальная реплика. Генератор учитывает выбранный образ;
смешанный формат поддерживает последовательности и подсказки. Фотографию для
фотозагадки автор добавляет самостоятельно.

Миграция: `20261014_0007`. Дополнительный демонстрационный маршрут создаётся командой
`docker compose exec -e PYTHONPATH=/app backend python scripts/seed_adventure.py`.
Скрипт идемпотентен и сохраняет существующие маршруты и игровой прогресс.
