# Form Builder

A small Google Forms-style app: create a form, share a fill link, collect answers, and inspect responses.

Built as an interview take-home, optimized for readable architecture, strong TypeScript modeling, and polished UX rather than feature breadth.

## Run it

```bash
npm install
npm run dev        # client http://localhost:5173, API http://localhost:3002
```

```bash
npm test           # Vitest: unit, API (Supertest) and UI behavior tests
npm run typecheck
npm run lint
npm run build      # typecheck + production build
npm start          # API + built app from dist/ (production mode)
```

Storage is in-memory: restarting the API clears all forms. In development the API also restarts when a `server/` or `shared/` file changes, so a form you had open can disappear. Create a new one.

### Generate a form with Ollama (optional)

The dashboard can generate a form from a description using a local [Ollama](https://ollama.com) model. Everything else works without it. Without Ollama, generating shows a friendly error (`503 MODEL_UNAVAILABLE`).

```bash
brew install ollama      # macOS; other systems: ollama.com/download
ollama pull llama3.2     # one-time download, about 2 GB
ollama serve             # keep running; "address already in use" means it already is
```

Then run `npm run dev` as usual. To check it is reachable: `curl http://127.0.0.1:11434/api/tags`. Override the defaults with `OLLAMA_MODEL` (default `llama3.2`) and `OLLAMA_HOST` (default `http://127.0.0.1:11434`). Generation takes a few seconds, times out after 90, and retries once if the model returns invalid JSON.

## Architecture

```text
src/               React app: features, thin UI wrappers over Mantine, typed API client
shared/contracts/  Zod schemas and inferred types used by both client and server
server/            Express API + in-memory store
tests/             Vitest suites
```

Each kind of state has one owner:

| State | Owner |
|---|---|
| Forms and submissions from the server | TanStack Query |
| Builder draft, respondent answers | React Hook Form |
| Active card, dialogs | Local React state |

```text
draft (RHF) -> draft adapter (validate + normalize) -> shared Zod contract -> API -> store
```

## Key decisions

- **Shared Zod contracts.** Client and server parse the same schemas, so request and response shapes cannot drift.
- **Drafts are looser than contracts.** While editing, prompts can be blank and option lists short. `draftToUpdateRequest` is the one gate that turns a draft into a strict request.
- **Explicit save with revision checks.** No autosave races. A stale tab gets a clear `409` and keeps its edits.
- **Full-form `PUT`.** Reorder, add, remove and type change stay atomic without per-question endpoints.
- **Submission snapshots.** Each response stores a copy of the form, so later edits never rewrite old answers.
- **Per-type registry.** Everything that differs by question type (create, convert, validate, serialize) is one entry in `draft/question-type-definitions.ts`. The compiler rejects a missing type.
- **Lazy routes.** Respondents never download the builder or drag-and-drop code.

## Builder performance

The editor is one form document shared by the edit, preview and responses routes. Typing in one question must not re-render the others:

- Components read form state with `useWatch` / `useFormState`, never `watch()` or `formState` from `useFormContext`. Those re-render the form's host and every field.
- The component that owns `useForm` reads no form state itself, so the context value stays stable.
- `QuestionCard` is memoized and takes stable props.

A test counts renders to guard this.

## Questions

A Zod discriminated union on `type`: short text, long text, number (optional min/max), date, single select, multi-select (stable option IDs), checkbox, rating (scale 3 to 10, default 5). To add a type: extend the contract and answer validation, add one registry entry, add the editor and respondent controls, and add response formatting.

## Routes and API

| Route | Purpose |
|---|---|
| `/` | Dashboard |
| `/forms/:id/edit`, `/preview`, `/responses` | Builder, live draft preview, submissions (share one draft, so unsaved edits survive moving between them) |
| `/f/:id` | Respondent form (serves the last save) |

The API is under `/api/forms`: list, create, `generate`, get, save (`PUT` with `expectedRevision`), `acceptance`, delete, `public`, and `submissions`. Submissions accept an `Idempotency-Key`. Errors share one DTO with a `requestId` (`400` `404` `409` `413` `422` `429` `503`). `409` means `CONFLICT` for a stale revision or `CLOSED` for a form that stopped accepting responses. Responses are `no-store`, and writes are rate limited. `CORS_ORIGINS`, `TRUST_PROXY` and `PORT` are read from the environment (`server/config.ts`).

## Tests

- Draft model across every question type, save adapter, save-issue paths.
- The builder UI against a fake API and a real router: load, save, Ctrl+S, conflict, validation focus, slash menu, type-change confirmation, unsaved-changes guard, delete, render counts.
- Answer building and validation, response summaries, API flows (create, update, conflict, submit, close, delete, generate).

Drag-and-drop layout and colour contrast need a real browser and are not covered.

## Tradeoffs and next steps

In-memory storage, no auth, no autosave, and the share link is always the last save (no publish step). Deliberately not built: conditional logic, sections, file uploads, collaboration, analytics, i18n.

Next: durable storage, auth, immutable published versions, response analytics and CSV export, Playwright happy-path and axe accessibility checks, metrics and tracing.
