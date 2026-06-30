'use strict';

const path = require('path');
// Load the single root .env shared by the repo (one level up from backend/).
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { getSignedRequest, hashUsers } = require('./learnosity');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * Sign a Learnosity request. Mirrors the Otus node-api POST /learnosity route
 * (source-code/node/services/node-api/routes/learnosity.js) minus auth/tracing.
 *
 * Body: { service, request, user_id?, domain?, action? }
 */
app.post('/sign', (req, res) => {
  try {
    const { service, request, domain, action } = req.body || {};

    if (!service || !request) {
      return res.status(400).json({ error: 'Missing required field: service and request' });
    }

    // Prefer an explicit user_id, falling back to the one inside the request
    // (same precedence as the Otus route).
    let user_id = req.body.user_id;
    if (!user_id && request.user_id) {
      user_id = request.user_id;
    }

    const signedRequest = getSignedRequest(service, request, user_id, domain || 'localhost', action);
    res.json(signedRequest);
  } catch (err) {
    console.error('Error signing Learnosity request:', err);
    res.status(500).json({ error: 'Failed to sign request', detail: String(err && err.message) });
  }
});

/**
 * Build the Events API `users` map ({ user_id: sha256(user_id + secret) }) so the
 * consumer secret never reaches the browser. Kept as a separate endpoint from
 * /sign to match Learnosity's documented Events API flow.
 *
 * Body: { user_ids: string[] }  ->  { "<user_id>": "<hash>", ... }
 */
app.post('/events-users', (req, res) => {
  try {
    const userIds = req.body && req.body.user_ids;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Missing required field: user_ids (non-empty array)' });
    }
    res.json(hashUsers(userIds));
  } catch (err) {
    console.error('Error hashing Events API users:', err);
    res.status(500).json({ error: 'Failed to hash users', detail: String(err && err.message) });
  }
});

app.listen(PORT, () => {
  console.log(`Learnosity signing API listening on http://localhost:${PORT}`);
});
