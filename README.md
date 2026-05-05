[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23822156&assignment_repo_type=AssignmentRepo)

# News Aggregator API

A RESTful API for a personalized news aggregator. Users sign up with a set of preferences (categories or keywords), authenticate with email and password, and fetch news articles from an external provider tailored to those preferences.

Built with Node.js, Express, bcrypt for password hashing, and JWT for stateless authentication. News responses are served from an in-memory TTL cache so repeated requests do not exhaust the provider's free-tier quota.

## Tech stack

- Node.js >= 18 (uses the global `fetch`)
- Express 4
- bcrypt for password hashing
- jsonwebtoken for issuing/verifying JWTs
- dotenv for configuration
- tap + supertest for testing

## Setup

```bash
npm install
cp .env.example .env
# edit .env and fill in JWT_SECRET and NEWS_API_KEY
```

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `JWT_SECRET` | dev fallback | Signing secret for JWTs. **Set this in production.** |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime, accepts any [`ms`](https://www.npmjs.com/package/ms)-compatible string |
| `NEWS_PROVIDER` | `gnews` | Currently only `gnews` is implemented |
| `NEWS_API_KEY` | _(none)_ | API key for the active provider. If unset, `/news` returns `[]` |
| `NEWS_CACHE_TTL_SECONDS` | `600` | TTL for the in-memory news cache |

A signing-secret fallback exists so that `npm test` can run without a `.env` file. **Always override `JWT_SECRET` in any non-test environment.**

## Running

```bash
npm start          # production-style: node server.js
npm test           # tap + supertest
```

The server listens on `http://localhost:${PORT}` (default `3000`).

## API reference

All authenticated routes expect an `Authorization: Bearer <token>` header. Tokens are obtained from `POST /users/login`.

### `POST /users/signup`

Register a new user.

```bash
curl -X POST http://localhost:3000/users/signup \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Clark Kent",
    "email": "clark@superman.com",
    "password": "Krypt()n8",
    "preferences": ["movies", "comics"]
  }'
```

- `200 OK` — `{ message, user: { name, email, preferences } }`
- `400 Bad Request` — missing/invalid fields, or email already registered

### `POST /users/login`

Exchange credentials for a JWT.

```bash
curl -X POST http://localhost:3000/users/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "clark@superman.com", "password": "Krypt()n8" }'
```

- `200 OK` — `{ token }`
- `401 Unauthorized` — unknown email or wrong password

### `GET /users/preferences`  *(auth required)*

Return the caller's stored preferences.

```bash
curl http://localhost:3000/users/preferences \
  -H "Authorization: Bearer $TOKEN"
```

- `200 OK` — `{ preferences: [...] }`
- `401 Unauthorized` — missing or invalid token

### `PUT /users/preferences`  *(auth required)*

Replace the caller's stored preferences.

```bash
curl -X PUT http://localhost:3000/users/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{ "preferences": ["movies", "comics", "games"] }'
```

- `200 OK` — `{ preferences: [...] }`
- `400 Bad Request` — `preferences` is not an array of strings
- `401 Unauthorized` — missing or invalid token

### `GET /news`  *(auth required)*

Fetch articles from the active news provider, queried by the caller's preferences.

```bash
curl http://localhost:3000/news \
  -H "Authorization: Bearer $TOKEN"
```

- `200 OK` — `{ news: [{ title, description, url, source, publishedAt }, ...] }`
- `401 Unauthorized` — missing or invalid token

If `NEWS_API_KEY` is unset or the upstream call fails, the endpoint still returns `200` with `news: []` and logs a warning server-side.

## Architecture

```
app.js                       # Express app (exported, no listen)
server.js                    # listen wrapper, used by `npm start`
routes/                      # express.Router modules
controllers/                 # request handlers
middleware/
  auth.js                    # JWT Bearer verification
  errorHandler.js            # JSON error responses, no stack leakage
services/news/
  index.js                   # provider selection + cache wrapping
  cache.js                   # in-memory TTL cache
  providers/
    gnews.js                 # GNews v4 search adapter
store/userStore.js           # in-memory user store
```

### News provider abstraction

`services/news/index.js` selects a provider based on `NEWS_PROVIDER` and applies the cache around the call. Each provider exports a uniform shape:

```js
module.exports = {
    name: 'gnews',
    fetch: async (query, apiKey) => Article[],
};
```

`Article` is normalized to `{ title, description, url, source, publishedAt }` so controllers do not depend on the active provider. Adding NewsAPI, NewsCatcher, or NewsAPI.ai is a single-file drop in `services/news/providers/` plus an entry in the `providers` map.

### Cache

`services/news/cache.js` is a simple `Map`-backed TTL cache keyed by `provider:query`. The TTL is configurable via `NEWS_CACHE_TTL_SECONDS`. The cache is in-memory only and resets on process restart, which is appropriate for this assignment.

### User store

`store/userStore.js` is an in-memory `Map` keyed by lowercased email. Replace with a real database (Postgres, Mongo, etc.) by swapping this module's implementation while keeping its `findByEmail` / `create` / `updatePreferences` interface.

## Testing

```bash
npm test
```

Runs the tap suite in [test/server.test.js](test/server.test.js) via supertest. The suite exercises signup, login, the auth middleware, both preference endpoints, and `/news`. All 15 assertions should pass without any additional setup &mdash; the dev fallback for `JWT_SECRET` and the graceful empty-result behavior on a missing news key make tests reproducible on a fresh clone.
