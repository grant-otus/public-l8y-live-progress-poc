'use strict';

const crypto = require('crypto');
const LearnositySDK = require('learnosity-sdk-nodejs');

const Learnosity = new LearnositySDK();

// Credentials come from the root .env (see .env-template). No values are hard-coded
// in the repo. Fail loudly if they're missing so misconfiguration is obvious.
const learnosityConsumerKey = process.env.LEARNOSITY_CONSUMER_KEY;
const learnositySecretKey = process.env.LEARNOSITY_SECRET_KEY;

if (!learnosityConsumerKey || !learnositySecretKey) {
  throw new Error(
    'Missing LEARNOSITY_CONSUMER_KEY / LEARNOSITY_SECRET_KEY. Copy .env-template to .env at the repo root and populate it.',
  );
}

/**
 * Sign a Learnosity API request.
 *
 * Direct port of the Otus node-api helper
 * (source-code/node/services/node-api/helpers/learnosity.js:getSignedRequest).
 * One helper signs every service we need: `items` (student view) and `events`
 * (educator view); `reports`/`data` work too if ever needed.
 */
function getSignedRequest(service, apiRequest, user_id, domain, action) {
  const securityPacket = {
    consumer_key: learnosityConsumerKey,
    domain: domain ? domain : 'localhost',
    user_id: user_id ? user_id : 'authorapi_demo-user',
  };

  const signedRequest = Learnosity.init(
    service,
    securityPacket,
    learnositySecretKey,
    apiRequest,
    action,
  );

  if (service === 'data' && signedRequest.security && action) {
    signedRequest.action = action;
  }

  return signedRequest;
}

/**
 * Compute the Events API `users` map: { user_id: sha256(user_id + secret) }.
 *
 * This is the documented hashing the Events API `users` init option expects
 * (https://help.learnosity.com/hc/en-us/articles/16458061832605-initialization-Events-API).
 * It lives server-side so the consumer secret never ships to the browser.
 *
 * Note: per Learnosity support, the current Events API also accepts plain string
 * user_id values without hashes — so this endpoint can be skipped entirely if you
 * prefer to pass ids directly. We keep it to match the documented flow.
 */
function hashUsers(userIds) {
  const users = {};
  for (const id of userIds) {
    users[id] = crypto.createHash('sha256').update(id + learnositySecretKey).digest('hex');
  }
  return users;
}

module.exports = { getSignedRequest, hashUsers };
