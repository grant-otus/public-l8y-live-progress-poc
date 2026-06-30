# l8y-live-progress-poc

A self-contained proof-of-concept demonstrating an **educator Live Progress** view
driven by the Learnosity **Events API**, alongside a **student assessment-taking**
view driven by the Learnosity **Items API**.

## What's here

```
backend/    Express signing API — POST /sign signs L8y API init requests
frontend/   Angular 15 app — landing page, educator view, student view
```

The pieces share a single fixture (`frontend/src/app/fixtures/poc-data.ts`) so the
student user ids the Items API reports against line up with the user list the
educator's Events API subscribes to. Run a student in one window and the educator
in another to watch events flow live. In order to test with a fresh assignment, 
increment the `ASSIGNMENT_ID` constant defined in [./frontend/src/app/fixtures/poc-data](./frontend//src/app/fixtures/poc-data.ts).

## Prerequisites

- Node 18+
- Two terminals
- A `local.otus.com` → `127.0.0.1` entry in your hosts file (see "Why
  `local.otus.com` and https?" below). On macOS/Linux:

  ```bash
  echo "127.0.0.1  local.otus.com" | sudo tee -a /etc/hosts
  ```

## Running

### 0. Credentials — root `.env` (required)

Both pieces share a single `.env` at the repo root, read only by the backend. It
is git-ignored; a committed `.env-template` shows the keys to populate:

```bash
cp .env-template .env
# then edit .env and set LEARNOSITY_CONSUMER_KEY / LEARNOSITY_SECRET_KEY
```

The Learnosity **secret never reaches the frontend** — the backend uses it to sign
requests and to hash Events API user ids (see `POST /events-users`).

### 1. Backend (signing API) — port 3001

```bash
cd backend
npm install
npm start
```

Sanity check:

```bash
curl localhost:3001/health
curl -XPOST localhost:3001/sign -H 'content-type: application/json' \
  -d '{"service":"items","request":{"user_id":"otus-student-101"},"user_id":"otus-student-101"}'
curl -XPOST localhost:3001/events-users -H 'content-type: application/json' \
  -d '{"user_ids":["otus-student-101","otus-teacher-0"]}'
```

The `/sign` call returns a signed request containing a `security` object with a
`signature`; `/events-users` returns a `{ "user_id": "sha256hash" }` map.

### 2. Frontend — https on local.otus.com:4200

```bash
cd frontend
npm install

# one-time: generate the local self-signed dev cert (git-ignored)
mkdir -p ssl
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout ssl/server.key -out ssl/server.crt \
  -subj "/CN=local.otus.com" -addext "subjectAltName=DNS:local.otus.com"

npm start
```

The dev server serves **https on `https://local.otus.com:4200`** (configured in
`angular.json`, using the self-signed cert in `frontend/ssl/`). `/sign` is proxied
to the backend (`proxy.conf.json`), so the backend must be running.

Open **https://local.otus.com:4200** and accept the self-signed certificate
warning the first time (the cert is for local dev only).

> ⚠️ Use `https://local.otus.com:4200`, **not** `http://localhost:4200`.
> The Learnosity APIs will not fully initialize on `localhost` — see below.

## Why `local.otus.com` and https?

The Learnosity Items API, when initialized with `events: true` (needed so the
assessment publishes events for the Live Progress view), loads a hidden
`events.learnosity.com` relay iframe that handshakes with the host page. That
handshake only succeeds if the page's origin is on a **domain registered with the
Learnosity consumer key**.

The dev consumer key configured in `.env` whitelists `local.otus.com` over
https — the same host the Otus app uses in local dev — but **not** `localhost`. On
`http://localhost:4200` the relay can't validate the host origin, the handshake
never completes, and Items API init stalls (the `readyListener` never fires; you
see a `postMessage` target-origin warning in the console). Serving from
`https://local.otus.com:4200` resolves it with no other workarounds.

In a real deployment this is a non-issue: use your own consumer key with your
actual serving domain(s) whitelisted over https, and remove the dev cert.

The dev cert is **not committed** (the private key is git-ignored) — you generate
a local self-signed cert in step 2 above.

## Demo flow

1. Open https://local.otus.com:4200 and choose a **student** (e.g. John Smith).
   The Learnosity Items API renders the assessment. Start it, answer, navigate
   between items, then **Submit** or **Save & Exit**.
2. In a second window open https://local.otus.com:4200 → **Educator**. The table
   lists the fixture students; as the student acts, rows update (status / active /
   current item) via the Events API.

## Learnosity credentials

Supply your Learnosity consumer key + secret via the root `.env` (copy from
`.env-template`). Nothing is hard-coded in the repo and the secret is **never sent
to the browser**:

- The backend signs Items/Events requests (`POST /sign`).
- The backend hashes Events API user ids (`POST /events-users`) — the frontend
  sends plain user ids and receives the `{ id: hash }` map.

Per Learnosity support, the current Events API also accepts plain `user_id`
strings without hashes; the `/events-users` hashing is kept to match Learnosity's
documented Events API flow and can be removed if you prefer passing ids directly.

## Fixture data

`frontend/src/app/fixtures/poc-data.ts` holds the hard-coded assignment, students,
and item references. Swap the `ITEMS` references / `ASSESSMENT_TITLE` / `STUDENTS`
to point at different content.
