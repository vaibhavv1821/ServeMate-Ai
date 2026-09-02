# ServMate — Real-Time System (Phase 3)

## Overview

Phase 3 adds real-time customer-provider communication via **Socket.io**, backed by **PostgreSQL** for persistence and **Upstash Redis** for ephemeral state (OTPs, rate limits).

---

## Socket.io Architecture

### Server Setup
- Socket.io is attached to the Node.js **HTTP server** (not Express directly)
- This is required so that the same TCP port handles both HTTP (REST) and WebSocket (Socket.io) traffic
- The `io` instance is made available throughout the application via `app.set('io', io)`

```
HTTP Server (port 5000)
    ├── Express App (HTTP/REST)
    └── Socket.io Server (WebSocket/polling)
```

### JWT Authentication Middleware
Every socket connection is authenticated **before** it is allowed to connect:

```js
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  const decoded = jwt.verify(token, JWT_SECRET);
  socket.userId = decoded.id;
  socket.userRole = decoded.role;
  next();
});
```

Unauthenticated or invalid-token connections receive a `connect_error` event and are dropped.

### Room Strategy

| Room | Members | Purpose |
|------|---------|---------|
| `user:{userId}` | Auto-joined on connect | Personal notifications (booking updates) |
| `conv:{conversationId}` | Joined via `join_conversation` event | Real-time chat messages |

Joining a conversation room is **authorization-checked** — only confirmed participants can join.

---

## Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Join a conversation room (participant-only) |
| `send_message` | `{ conversationId, content }` | Send a message (persisted to DB + broadcast) |
| `mark_read` | `{ conversationId }` | Mark messages in conversation as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `new_message` | `{ message }` | New message in a conversation |
| `messages_read` | `{ conversationId, readBy }` | Messages marked as read |
| `booking_update` | `{ bookingId, status }` | Booking status changed |
| `joined_conversation` | `{ conversationId }` | Confirmation of room join |
| `error` | `{ message }` | Socket-level error |

---

## Message Persistence

PostgreSQL is the **source of truth** for all messages. Socket.io only handles delivery.

Flow:
```
Client sends 'send_message'
    → Server validates participant
    → Server saves to PostgreSQL (prisma.message.create)
    → Server broadcasts 'new_message' to room
    → All clients in room receive message
```

If the socket is not connected, clients fall back to the REST `POST /conversations/:id/messages` endpoint, which also emits to the socket room if available.

---

## Conversation Authorization

- A conversation is created by a **customer** linked to a specific **booking**
- Only the `customerId` and `providerId` from that conversation record can access messages
- Any attempt by a third party returns `404` (not `403`) to avoid leaking conversation existence

---

## Real-Time Booking Events

When booking status changes (accept, reject, cancel, OTP verify, complete), the backend emits `booking_update` to both `user:{customerId}` and `user:{providerId}` rooms.

```js
io.to(`user:${customerId}`).emit('booking_update', { bookingId, status });
io.to(`user:${providerId}`).emit('booking_update', { bookingId, status });
```

PostgreSQL is updated **first**, then the socket event is emitted.

---

## Reconnection

Socket.io client is configured with:
- `reconnection: true`
- `reconnectionAttempts: 5`
- `reconnectionDelay: 1000ms`

On reconnect, the client re-joins conversation rooms via `join_conversation`.

---

## Frontend Implementation

- `frontend/src/api/socket.js` — singleton socket client with lazy connection
- `frontend/src/pages/Messages.jsx` — shared chat UI for customer and provider
- Routes: `/customer/messages` and `/provider/messages`
