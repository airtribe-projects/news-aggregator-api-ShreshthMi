[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=23822156&assignment_repo_type=AssignmentRepo)

# News Aggregator API

A RESTful API for a personalized news aggregator. Users sign up with a set of preferences (categories or keywords), authenticate with email and password, and fetch news articles from an external provider tailored to those preferences.

Built with Node.js, Express, bcrypt for password hashing, and JWT for stateless authentication. News responses are served from an in-memory TTL cache so repeated requests do not exhaust the provider's free-tier quota.

## Tech stack

- Node.js >= 18
- Express 4
- bcrypt for password hashing
- jsonwebtoken for issuing/verifying JWTs
- axios for outbound HTTP to the news provider
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
| `NEWS_REFRESH_INTERVAL_MS` | `300000` | How often the background job re-warms the cache (only runs under `npm start`, not during tests) |

A signing-secret fallback exists so that `npm test` can run without a `.env` file. **Always override `JWT_SECRET` in any non-test environment.**

## Running

```bash
npm start          # production-style: node server.js
npm test           # tap + supertest
```

The server listens on `http://localhost:${PORT}` (default `3000`).

## API reference

All authenticated routes expect an `Authorization: Bearer <token>` header. Tokens are obtained from `POST /users/login` (or its alias `POST /login`).

**Path aliases:** the assignment brief names paths without the `/users` prefix, while the included test file (`test/server.test.js`) uses `/users/*`. Both are wired to the same controllers, so either form works:

| Brief path | Test-file path |
|---|---|
| `POST /register` | `POST /users/signup` |
| `POST /login` | `POST /users/login` |
| `GET /preferences` | `GET /users/preferences` |
| `PUT /preferences` | `PUT /users/preferences` |

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

- `200 OK` — `{ news: [{ id, title, description, url, source, publishedAt }, ...] }`. Each article is enriched with a stable `id` (12-char SHA1 of `url`) so it can be marked read or favorite. When `NEWS_API_KEY` is unset, the endpoint returns `{ news: [] }` with `200` &mdash; this is intentional graceful degradation so a fresh clone can run `npm test` without provider credentials. A warning is logged server-side.
- `401 Unauthorized` — missing or invalid token
- `502 Bad Gateway` — `{ error: "Upstream service error" }` when the API key is configured but the provider call fails (network error, non-2xx response, etc.). The underlying error is logged server-side; clients only see the public message.

### `GET /news/search/:keyword`  *(auth required)*

Search the news provider for articles matching a single keyword.

```bash
curl http://localhost:3000/news/search/technology \
  -H "Authorization: Bearer $TOKEN"
```

- `200 OK` — `{ news: [...] }` with the same enriched shape as `GET /news`.
- `400 Bad Request` — keyword is empty after trim.
- `401 Unauthorized` — missing or invalid token.
- `502 Bad Gateway` — upstream provider failure.

### `POST /news/:id/read`  *(auth required)*

Mark an article (by the `id` returned from `GET /news` or `GET /news/search/:keyword`) as read for the authenticated user.

```bash
curl -X POST http://localhost:3000/news/0e1dfb430751/read \
  -H "Authorization: Bearer $TOKEN"
```

- `200 OK` — `{ message, article }`.
- `404 Not Found` — `id` has not been seen yet (call `GET /news` first to populate the article store).
- `401 Unauthorized` — missing or invalid token.

### `POST /news/:id/favorite`  *(auth required)*

Mark an article as favorite. Same semantics as `/read`.

### `GET /news/read`  *(auth required)*

List the caller's read articles.

```bash
curl http://localhost:3000/news/read \
  -H "Authorization: Bearer $TOKEN"
```

- `200 OK` — `{ read: [Article, ...] }`.
- `401 Unauthorized` — missing or invalid token.

### `GET /news/favorites`  *(auth required)*

List the caller's favorite articles. Returns `{ favorites: [Article, ...] }`. Otherwise identical to `/news/read`.

## Architecture

```
app.js                       # Express app (exported, no listen)
server.js                    # listen wrapper + periodic-refresh kickoff
routes/                      # express.Router modules
controllers/                 # request handlers
middleware/
  auth.js                    # JWT Bearer verification
  errorHandler.js            # JSON error responses, no stack leakage
services/news/
  index.js                   # provider selection + cache wrapping + refresh
  cache.js                   # in-memory TTL cache
  providers/
    gnews.js                 # GNews v4 search adapter (axios)
store/
  userStore.js               # in-memory user store w/ read & favorite sets
  articleStore.js            # id -> article map populated on /news responses
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

`services/news/cache.js` is a simple `Map`-backed TTL cache keyed by `provider:sorted-prefs-query`. The TTL is configurable via `NEWS_CACHE_TTL_SECONDS`. The cache is in-memory only and resets on process restart, which is appropriate for this assignment.

The cache is **shared across users** &mdash; two users with the same preferences serve from the same entry, which keeps free-tier quota in check. Preferences are sorted before building the key so `[a, b]` and `[b, a]` hit the same cache entry.

**Explicit invalidation on `PUT /users/preferences`:** before persisting the new preferences, the controller calls `newsService.invalidatePreferences(oldPrefs)` to evict the cache entry for the user's previous preferences. This guarantees that a subsequent `GET /news` for those previous preferences cannot serve a stale TTL-window response. The trade-off is that other users sharing those old preferences also take one cache miss; that is the safe correctness choice over leaving potentially stale data.

### Periodic cache refresh

`server.js` calls `newsService.startPeriodicRefresh(intervalMs)` after `app.listen` succeeds. The job iterates all users, deduplicates cache keys by sorted preferences, and re-fetches each so cached articles stay reasonably fresh. The interval is configurable via `NEWS_REFRESH_INTERVAL_MS` (default 5 minutes). Per-key failures are caught and logged so one bad provider response doesn't stop the loop.

The timer is started in `server.js`, **not** in `app.js`. Tests load `app.js` via supertest and never trigger the timer, so `npm test` doesn't burn quota or leave a hanging interval.

### User and article stores

`store/userStore.js` is an in-memory `Map` keyed by lowercased email. Each user record carries `readArticles` and `favoriteArticles` Sets. `store/articleStore.js` is a separate in-memory `Map` from a 12-char SHA1 of the article URL to the normalized article object. It's populated whenever `/news` (or `/news/search/:keyword`) serves articles, which is what makes the read/favorite endpoints work — they only need the `id` in the path and look the article body up locally. Both stores reset on process restart; swap each module's implementation for a database while keeping their public functions.

## Testing

```bash
npm test
```

Runs the tap suite in [test/server.test.js](test/server.test.js) via supertest. The suite exercises signup, login, the auth middleware, both preference endpoints, and `/news`. All 15 assertions pass without any additional setup &mdash; the dev fallback for `JWT_SECRET` and the graceful empty-result behavior on a missing news key make tests reproducible on a fresh clone. The Step 6 extension endpoints (read/favorite/search/refresh) are not covered by the included tests; they were validated end-to-end via supertest smoke runs against the live GNews API.
