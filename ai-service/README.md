# MedAssist+ AI Service

Python microservice that powers the AI features of MedAssist+. The Node/TypeScript
backend calls it at the endpoints below and gracefully falls back to local
heuristics when it is offline.

## Endpoints

| Method | Path            | Purpose                                              |
| ------ | --------------- | ---------------------------------------------------- |
| GET    | `/health`       | Health check used by the backend's `aiServiceHealthy` |
| POST   | `/ai/chat`      | Adaptive triage conversation (returns next question or final result) |
| POST   | `/ai/triage`    | One-shot triage for a provided history               |
| POST   | `/summarize`    | Patient-friendly medical report summary              |
| GET    | `/docs`         | OpenAPI docs (Swagger UI)                            |

The `/ai/chat` and `/ai/triage` response contract is identical to the backend's
local triage engine (`backend/src/services/triage/engine.ts`), so the backend
can switch between the two transparently.

## Architecture

```
app/
├── main.py                  # FastAPI app + CORS + routing
├── config.py                # Env-driven settings
├── schemas.py               # Pydantic request models (backend contract)
├── agents/
│   ├── triage_agent/        # Adaptive symptom triage (question/result flow)
│   ├── appointment_agent/   # NL helpers for slot/booking messages
│   ├── queue_agent/         # Wait-time estimates & status wording
│   └── report_agent/        # Report summarization (LLM or extractive)
├── resources/languages/     # User-facing strings (en.json), i18n-ready
├── routes/                  # HTTP route modules
└── services/                # languages store + optional LLM client
```

The triage question bank, category labels, option texts and all user-facing
messages live in `app/resources/languages/en.json`. Add another locale file and
set `LANGUAGE` to translate the service without code changes.

## Running

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows (POSIX: source .venv/bin/activate)
pip install -r requirements.txt
python run.py                 # http://127.0.0.1:5001
```

Set `AI_SERVICE_PORT` / `AI_SERVICE_HOST` in a local `.env` (see `.env.example`)
to change the port. The backend expects the service on port `5001` by default.

## Optional LLM integration

Agents run fully offline by default (deterministic, tested, no API key).
To use a real language model, point `LLM_API_URL` at any OpenAI-compatible
endpoint:

```dotenv
LLM_API_URL=https://api.groq.com/openai/v1/chat/completions
LLM_API_KEY=
LLM_MODEL=openai/gpt-oss-120b
```

When configured, report summary, pre-consult notes, and diagnosis assist call
the model first and fall back to the offline text if it fails. Symptom chat
still follows the question tree. The model may rephrase the question sentence
and the final reason. It does not change the buttons, urgency, or specialty.

## Tests

```bash
.venv\Scripts\activate
pytest -q
```

The chat tests mirror `backend/tests/ai.test.ts` so a green backend suite and a
green service suite guarantee contract parity.