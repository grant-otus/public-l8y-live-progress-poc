# l8y-live-progress-poc

Proof-of-concept for an educator Live Progress view (Learnosity Events API) and a
student assessment view (Learnosity Items API), with a minimal Node service that
signs Learnosity requests. It reproduces an intermittent Events API relay failure
(see Known issue).

## Layout

```
backend/    Express signing API (POST /sign, POST /events-users)
frontend/   Angular 15 app: landing, educator view, student view
```

Both views share one fixture (`frontend/src/app/fixtures/poc-data.ts`) so the
student user ids the Items API reports against match the user list the educator's
Events API subscribes to. Increment `ASSIGNMENT_ID` there to test with a fresh
assignment.

## Prerequisites

- Node 18+

## Setup

Credentials live in one git-ignored `.env` at the repo root (template in
`.env-template`), read only by the backend:

```bash
cp .env-template .env
# set LEARNOSITY_CONSUMER_KEY / LEARNOSITY_SECRET_KEY
```

## Run

Backend (port 3001):

```bash
cd backend
npm install
npm start
```

Frontend (port 4200):

```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200. `/sign` and `/events-users` are proxied to the
backend, so the backend must be running.

Backend sanity check:

```bash
curl localhost:3001/health
curl -XPOST localhost:3001/sign -H 'content-type: application/json' \
  -d '{"service":"items","request":{"user_id":"otus-student-101"},"user_id":"otus-student-101"}'
```

## Demo flow

1. Open http://localhost:4200 and pick a student. The Items API renders the
   assessment; start it, answer, navigate between items, then Submit or Save & Exit.
2. In a second window, open the educator view. The table lists the fixture students
   and updates (status / active / current item) as the student acts.

## Known issue

Setting the Items API top-level `events: true` (needed for `eventsApp().publish`)
loads an events.learnosity.com relay iframe that handshakes with the host page over
postMessage. Intermittently the relay targets its own origin
(`https://events.learnosity.com`) instead of the page origin, so the browser
rejects the message:

```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided
('https://events.learnosity.com') does not match the recipient window's origin
('http://localhost:4200').
```

When it happens the handshake never completes and the Items API `readyListener`
never fires, so the assessment does not initialize. It varies per page load and is
independent of host, port, https, and the cert.

This build sets top-level `events: false` (keeping `config.configuration.events:
true`) to avoid the relay. Set it back to `true` in `getInitOptions()` to reproduce.

## Credentials

Consumer key and secret come from the root `.env`; nothing is hard-coded. The
backend signs requests (`POST /sign`) and can hash Events API user ids
(`POST /events-users`), so the secret never reaches the browser. The app currently
passes plain `user_id` strings, which the Events API accepts, so `/events-users` is
optional.

## Fixture data

`frontend/src/app/fixtures/poc-data.ts` holds the assignment, students, and item
references. Swap `ITEMS` / `ASSESSMENT_TITLE` / `STUDENTS` to point at other content.
```
