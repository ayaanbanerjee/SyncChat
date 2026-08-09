# Simple Real-Time Chat App

A simple real-time chat application built with **React**, **Node.js/Express**, **Socket.io**, and **MongoDB**. Users pick a username, join a shared chat room, and exchange text messages instantly. No authentication — this is intentionally a minimal MVP.

## Features

- Enter a username and join a common chat room (no real auth).
- Send and receive text messages instantly, without refreshing.
- Chat history persists in MongoDB and reloads after a page refresh.
- Sender name and timestamp shown on every message.
- Typing indicator ("X is typing...") with automatic 2-second timeout.
- Online/offline connection status plus a live online user count in the header.
- Message delivery status (Sent → Delivered → Read) shown on the sender's own messages.
- Graceful handling of server/socket errors — the app shows an error message instead of crashing.
- Simple, clean layout: username screen, message list, text input, send button, logout button.

## Technologies Used

**Backend:** Node.js, Express, Socket.io, Mongoose (MongoDB), dotenv, cors
**Frontend:** React (Vite), React Router, Socket.io-client, axios

## Folder Structure

```
chat-app/
├── backend/
│   ├── src/
│   │   ├── config/database.js             # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── messageController.js       # REST request handling for messages
│   │   │   └── userController.js          # REST endpoint for online users
│   │   ├── models/
│   │   │   ├── messageModel.js            # Mongoose Message schema (incl. status, roomId)
│   │   │   └── userModel.js               # In-memory connected-user store
│   │   ├── services/
│   │   │   ├── messageService.js          # DB operations for messages (create/deliver/read)
│   │   │   └── userService.js             # Presence logic on top of userModel
│   │   ├── routes/messageRoutes.js        # API endpoint definitions
│   │   ├── sockets/chatSocket.js          # All Socket.io event handlers
│   │   ├── middleware/errorHandler.js     # Centralized error handler
│   │   ├── app.js                         # Express app configuration
│   │   └── server.js                      # Starts Express + Socket.io + DB connection
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── MessageList.jsx
    │   │   ├── MessageItem.jsx
    │   │   ├── MessageInput.jsx
    │   │   ├── TypingIndicator.jsx        # "X is typing..." banner
    │   │   ├── OnlineStatus.jsx           # Connection status + online user count
    │   │   └── MessageStatus.jsx          # Sent / Delivered / Read ticks
    │   ├── hooks/
    │   │   └── useChatSocket.js           # All Socket.io wiring for the Chat page
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   └── Chat.jsx
    │   ├── services/
    │   │   ├── api.js                     # REST API calls (axios)
    │   │   └── socket.js                  # Socket.io client instance
    │   ├── App.jsx
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

## Backend Setup

1. Make sure MongoDB is running locally, or have a MongoDB Atlas connection string ready.
2. `cd backend`
3. Copy the environment file: `cp .env.example .env` and fill in `DATABASE_URL` if needed.
4. Install dependencies and start the server:

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:5000` by default. `npm run dev` uses `nodemon` to auto-restart on file changes. (If you'd rather avoid the extra dependency, you can swap the `dev` script for `node --watch src/server.js` on Node 18.11+ — just always run it via `npm run dev`, not by typing the path manually, so it points at `src/server.js` correctly.)

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Copy `.env.example` to `.env` first if you need to change the API/socket URLs. The frontend runs on `http://localhost:5173` by default (Vite).

## Environment Variables

**backend/.env**
```
PORT=5000
DATABASE_URL=mongodb://127.0.0.1:27017/chatapp
CLIENT_URL=http://localhost:5173
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Never commit your real `.env` file.** Only `.env.example` (placeholders only) should be pushed to GitHub. Add `.env` and `node_modules/` to `.gitignore`.

## Database Setup

MongoDB is used via Mongoose. No manual schema/table creation is required — Mongoose creates the `messages` collection automatically on first insert, based on `messageModel.js`:

```js
{
  username: String,    // required, max 50 chars
  text: String,         // required, max 500 chars
  roomId: String,        // defaults to "global"
  status: String,         // "sent" | "delivered" | "read", defaults to "sent"
  createdAt: Date          // defaults to now
}
```

Online/typing presence is **not** stored in MongoDB — it's tracked in memory (see Design Decisions below).

If using MongoDB Atlas, set `DATABASE_URL` in `backend/.env` to your Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/chatapp`). A `localhost` connection string only works on your own machine — anyone else who clones the repo needs their own local MongoDB running, or an Atlas URL.

## API Endpoints

### `GET /api/messages?roomId=global`
Returns all previously saved messages for a room (oldest first). `roomId` defaults to `"global"`.
```json
{
  "success": true,
  "messages": [
    { "_id": "...", "username": "Rahul", "text": "Hello", "roomId": "global", "status": "read", "createdAt": "2026-08-09T10:00:00.000Z" }
  ]
}
```

### `POST /api/messages`
Body: `{ "username": "Rahul", "text": "Hello everyone", "roomId": "global" }` (`roomId` optional).
- Validates username and text (both required, text ≤ 500 chars).
- Saves the message to MongoDB with `status: "sent"`.
- Broadcasts it to all connected clients via the `newMessage` Socket.io event.
- If more than one user is currently online, marks it `delivered` and emits `message:delivered`.
- Returns the saved message as `messageData` in the response.

### `GET /api/users/online`
Returns the current online user count and usernames (from the in-memory presence store).
```json
{ "success": true, "onlineCount": 2, "onlineUsers": ["Rahul", "Asha"] }
```

### `GET /api/health`
```json
{ "success": true, "message": "Server is running" }
```

## Socket.io Events

**Client → Server**
- `user:join` — `{ username, roomId }`, sent right after connecting.
- `typing` — `{ username, roomId }`.
- `stopTyping` — `{ username, roomId }`.
- `message:read` — `{ messageIds, username }`, sent when the chat screen has messages visible.

**Server → Client**
- `newMessage` — a new message was saved; payload is the saved message document.
- `message:delivered` — `{ messageId, status: "delivered" }`.
- `message:statusUpdated` — `{ messageId, status: "read" }`.
- `userTyping` / `userStoppedTyping` — `{ username, roomId }`.
- `users:update` — `{ onlineCount }`, broadcast whenever presence changes.
- `user:online` / `user:offline` — `{ username, isOnline }`, broadcast on first-connect / fully-disconnect.

## Design Decisions

### REST API and Socket.io
REST APIs are used for loading chat history and saving messages. Socket.io is used only for real-time updates such as new messages, typing status, user presence, and message status changes.

### Message Flow
```
Frontend
   ↓
POST /api/messages
   ↓
Backend validates and saves the message
   ↓
Backend emits newMessage using Socket.io
   ↓
Connected users receive the message
```
This prevents the frontend from creating duplicate messages — the sender never appends its own message locally; it waits for the same `newMessage` broadcast every other client receives.

### Typing Indicator
Typing status is temporary and does not need to be stored in the database. It is managed through Socket.io events and removed automatically when the user stops typing, sends the message, clears the input, goes 2 seconds without a new keystroke, or disconnects.

### Online and Offline Status
Online users are tracked in memory using their Socket.io connection or socket ID (`userModel.js`). A user is considered offline when their socket disconnects and they have no other open connections. This is suitable for this simple project but may need Redis or a shared store for a large production system running multiple server instances.

### Delivered and Read Status
Message status is stored in the database:
```
sent → delivered → read
```
- `sent` means the backend saved the message.
- `delivered` means the message was sent to a connected recipient (there was at least one other online user when it was created).
- `read` means the recipient opened the chat and the message became visible.

For this simple version, a message is marked as read when the chat screen is opened or the message becomes visible — the frontend requests `message:read` for any message not authored by the current user that isn't already marked `read`.

### Scope Assumption
This application uses dummy username-based login. It does not provide password authentication or secure user identity verification. Usernames are used only to demonstrate chat functionality.

## How to Test

1. Start MongoDB, then the backend (`npm run dev` in `backend/`), then the frontend (`npm run dev` in `frontend/`).
2. Open `http://localhost:5173` in two different browser tabs (or two devices on the same network, using your machine's local IP instead of `localhost`).
3. In each tab, enter a different username and click **Join Chat**.
4. Start typing in one tab — the other tab should show "X is typing...", which disappears after you stop for ~2 seconds, send, or clear the input.
5. Check the header — both tabs should show an online user count of 2 while both are connected.
6. Send a message from one tab — it should appear instantly in both tabs, and the sender should see it move from "✓ Sent" to "✓✓ Delivered" to "✓✓ Read" as the other tab receives and views it.
7. Refresh either tab — previous messages and their status should still be visible (loaded from MongoDB).
8. Close one tab — the other tab's online count should drop back to 1.
9. Try sending an empty message — the send button stays disabled / nothing is sent.
10. Stop the backend — the frontend should show "Offline" without crashing, and reconnect automatically once the backend is back.

## Known Limitations

- No authentication or per-user identity beyond a self-reported username.
- Single global chat room only — no group creation (though `roomId` is threaded through the code for future extension).
- No message editing, deletion, or file/image attachments.
- No push notifications.
- Online presence and typing state reset if the backend restarts (in-memory only, by design).
- Not configured for production deployment (CORS, env vars, etc. are set up for local development).
