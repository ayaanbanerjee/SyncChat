# SyncChat

A production-style real-time messaging platform built with React, Node.js, Socket.io, and MongoDB. Demonstrates full-stack engineering skills including JWT authentication, private/group chat, file sharing, real-time presence, and a clean layered architecture.

## Architecture

```
React (Vite)
    │
    ├── REST API (Axios + JWT)
    └── WebSocket (Socket.io-client)
            │
    Node.js + Express
            │
    ├── MongoDB (Mongoose)   — persistent data
    └── Redis (optional)     — presence + pub/sub
```

## Features

- JWT register / login / logout
- Password hashing with bcrypt
- Protected REST APIs and authenticated Socket.io connections
- User search, profile, avatar upload (Cloudinary)
- Private 1-to-1 conversations
- Group chat — create, rename, add/remove members, assign admins, delete
- Real-time messaging with Socket.io
- Reply to message, edit message, delete message
- Image and file sharing (Cloudinary)
- Cursor-based pagination (infinite scroll upward)
- Sent / Delivered / Read message status
- Typing indicators per conversation
- Online / offline presence with last seen
- In-app notifications
- Message search (MongoDB full-text)
- Security: Helmet, CORS, rate limiting, input validation, request size limits
- Dark theme UI
- Docker support
- GitHub Actions CI/CD
- 11 automated API tests (Jest + Supertest)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Axios, Socket.io-client, react-hot-toast, date-fns |
| Backend | Node.js, Express, Socket.io, Mongoose, bcryptjs, jsonwebtoken |
| Database | MongoDB (Atlas or local) |
| File Storage | Cloudinary |
| Cache / Presence | Redis (optional) |
| Security | Helmet, express-rate-limit, CORS |
| Testing | Jest, Supertest |
| DevOps | Docker, docker-compose, GitHub Actions |

## Folder Structure

```
chat-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # MongoDB connection
│   │   │   ├── cloudinary.js        # Cloudinary SDK config
│   │   │   └── redis.js             # Redis client (optional)
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── conversationController.js
│   │   │   ├── messageController.js
│   │   │   └── notificationController.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js    # JWT protect + socket verify
│   │   │   └── errorHandler.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Conversation.js
│   │   │   ├── Message.js
│   │   │   └── Notification.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── conversationRoutes.js
│   │   │   ├── messageRoutes.js
│   │   │   └── notificationRoutes.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── conversationService.js
│   │   │   ├── messageService.js
│   │   │   └── notificationService.js
│   │   ├── sockets/
│   │   │   └── chatSocket.js        # All Socket.io event handlers
│   │   ├── app.js                   # Express app + middleware
│   │   └── server.js                # HTTP server entry point
│   ├── tests/
│   │   └── api.test.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.jsx
│   │   │   ├── ConversationPanel.jsx
│   │   │   ├── GroupInfoPanel.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   ├── MessageItem.jsx
│   │   │   ├── NewGroupModal.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── ProfileModal.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Auth state + token management
│   │   ├── pages/
│   │   │   ├── Auth.jsx             # Login + Register
│   │   │   └── Chat.jsx             # Main chat layout
│   │   ├── services/
│   │   │   ├── api.js               # All Axios calls
│   │   │   └── socket.js            # Socket.io client instance
│   │   ├── App.jsx
│   │   ├── index.css                # CSS variables + global styles
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .env.example
│   └── package.json
│
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Environment Variables

### backend/.env
```
PORT=5000
NODE_ENV=development
DATABASE_URL=mongodb://127.0.0.1:27017/syncchat
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
REDIS_URL=redis://localhost:6379
```

### frontend/.env
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

**Never commit `.env` files.** Only `.env.example` files are committed.

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads — optional for basic use)

### Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Docker Setup

```bash
# Copy and fill in secrets
cp backend/.env.example backend/.env

# Start all services (MongoDB, Redis, backend, frontend)
docker compose up --build

# App available at http://localhost
```

## API Documentation

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Register new user |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | ✓ | Get current user |
| PUT | /api/auth/change-password | ✓ | Change password |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/search?q= | Search users by name/username |
| GET | /api/users/:username | Get user profile |
| PUT | /api/users/me/profile | Update name/bio |
| POST | /api/users/me/avatar | Upload avatar |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/conversations | Get all conversations |
| GET | /api/conversations/:id | Get single conversation |
| POST | /api/conversations/direct | Start or get direct chat |
| POST | /api/conversations/group | Create group |
| PUT | /api/conversations/:id | Update group info (admin) |
| DELETE | /api/conversations/:id | Delete group (admin) |
| POST | /api/conversations/:id/members | Add members (admin) |
| DELETE | /api/conversations/:id/members/:userId | Remove member |
| POST | /api/conversations/:id/admins/:userId | Assign admin |
| DELETE | /api/conversations/:id/admins/:userId | Remove admin |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/messages/:conversationId?cursor= | Get messages (paginated) |
| POST | /api/messages/:conversationId | Send text message |
| POST | /api/messages/:conversationId/file | Upload file/image |
| PUT | /api/messages/:messageId | Edit message |
| DELETE | /api/messages/:messageId | Delete message |
| GET | /api/messages/search?q= | Search messages |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | Get notifications + unread count |
| PUT | /api/notifications/read-all | Mark all as read |

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| typing:start | { conversationId } | User started typing |
| typing:stop | { conversationId } | User stopped typing |
| message:delivered | { messageId } | Acknowledge delivery |
| message:read | { conversationId } | Mark conversation as read |
| conversation:join | { conversationId } | Join a new room |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| message:new | message object | New message in a conversation |
| message:edited | message object | Message was edited |
| message:deleted | { messageId, conversationId } | Message was deleted |
| message:delivered | { messageId, userId } | Message delivered to user |
| message:read | { conversationId, userId } | Conversation read by user |
| typing:start | { userId, username, conversationId } | Someone is typing |
| typing:stop | { userId, conversationId } | Someone stopped typing |
| presence:update | { userId, isOnline } | User came online/offline |
| conversation:created | conversation object | New conversation created |
| notification:new | notification object | New in-app notification |

## Database Schema

### User
```
_id, name, username (unique), email (unique), passwordHash (hidden),
avatar, bio, lastSeen, createdAt, updatedAt
```

### Conversation
```
_id, type (direct|group), name, groupImage, createdBy,
admins[], members[], lastMessage, lastMessageAt, createdAt, updatedAt
```

### Message
```
_id, conversationId, sender, type (text|image|file),
text, fileUrl, fileName, fileSize, mimeType,
replyTo, deliveredTo[], readBy[],
isEdited, isDeleted, createdAt, updatedAt
```

### Notification
```
_id, recipient, type, actor, conversationId, messageId,
text, isRead, createdAt
```

## Authentication Flow

```
1. POST /api/auth/register  →  bcrypt hash password  →  save User  →  return JWT
2. POST /api/auth/login     →  verify password        →  return JWT
3. All protected requests   →  Authorization: Bearer <token>
4. Socket.io connect        →  socket.handshake.auth.token  →  verified server-side
```

## Message Flow

```
User types → POST /api/messages/:id
  → messageService.sendMessage() saves to MongoDB
  → io.to(conversationId).emit('message:new', message)
  → All members in that Socket.io room receive it instantly
  → Recipient emits message:read → sender sees read receipt
```

## Testing

```bash
cd backend
npm test
```

11 tests covering: register, login, unauthorized access, get current user, user search, create group, send message, retrieve messages, edit message, delete message, authorization enforcement.

## Deployment

1. Set all environment variables on your hosting platform
2. Backend: `npm start` (or use the Dockerfile)
3. Frontend: `npm run build` → serve the `dist/` folder
4. For multi-instance backend: set `REDIS_URL` to enable Socket.io Redis adapter

## Resume Bullet Points

- Built a production-style real-time messaging platform (SyncChat) with JWT authentication, private/group chat, file sharing via Cloudinary, and cursor-based message pagination using React, Node.js, Socket.io, and MongoDB
- Designed a normalized MongoDB schema (User, Conversation, Message, Notification) with proper indexes supporting full-text search and paginated queries across millions of messages
- Implemented secure Socket.io architecture with JWT middleware, per-conversation room isolation, and Redis-backed presence tracking supporting horizontal scaling
- Enforced layered backend architecture (routes → controllers → services → models) with centralized error handling, Helmet security headers, rate limiting, and input validation across all REST and WebSocket endpoints
- Delivered end-to-end test coverage (Jest + Supertest), Docker Compose multi-service setup, and GitHub Actions CI pipeline with automated test and build gates on every pull request
