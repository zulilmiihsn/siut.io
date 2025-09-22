# Server Specification

Runtime: Node.js, Express, Socket.io

- Port: 5000
- Endpoints: `GET /` health check
- Socket.io events:
  - `create-room` -> server returns `{ roomId }`
  - `join-room` ({ roomId }) -> `{ ok: true }` or `{ error }`
  - `submit-gesture` ({ roomId, gesture })
  - `round-result` broadcast: `{ roomId, round, players, gestures, result }`

State: in-memory `rooms` map.


