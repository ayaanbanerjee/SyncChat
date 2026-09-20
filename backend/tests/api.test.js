require('dotenv').config({ path: '.env' });
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

const TEST_USER = {
  name: 'Test User',
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'password123',
};

let token = '';
let userId = '';
let conversationId = '';
let messageId = '';

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
});

afterAll(async () => {
  // Clean up test data
  await mongoose.connection.collection('users').deleteMany({ email: TEST_USER.email });
  await mongoose.disconnect();
});

// 1. Register
test('POST /api/auth/register — creates a new user', async () => {
  const res = await request(app).post('/api/auth/register').send(TEST_USER);
  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.token).toBeDefined();
  token = res.body.token;
  userId = res.body.user._id;
});

// 2. Login
test('POST /api/auth/login — returns token', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: TEST_USER.email, password: TEST_USER.password });
  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeDefined();
});

// 3. Unauthorized request
test('GET /api/conversations — returns 401 without token', async () => {
  const res = await request(app).get('/api/conversations');
  expect(res.statusCode).toBe(401);
});

// 4. Get current user
test('GET /api/auth/me — returns current user', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  expect(res.statusCode).toBe(200);
  expect(res.body.user.username).toBe(TEST_USER.username);
});

// 5. Search users
test('GET /api/users/search — returns users', async () => {
  const res = await request(app).get('/api/users/search?q=test').set('Authorization', `Bearer ${token}`);
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.users)).toBe(true);
});

// 6. Create group conversation
test('POST /api/conversations/group — creates a group', async () => {
  const res = await request(app)
    .post('/api/conversations/group')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Group', memberIds: [] });
  expect(res.statusCode).toBe(201);
  expect(res.body.conversation.type).toBe('group');
  conversationId = res.body.conversation._id;
});

// 7. Send message
test('POST /api/messages/:conversationId — sends a message', async () => {
  const res = await request(app)
    .post(`/api/messages/${conversationId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Hello from test!' });
  expect(res.statusCode).toBe(201);
  expect(res.body.message.text).toBe('Hello from test!');
  messageId = res.body.message._id;
});

// 8. Retrieve messages
test('GET /api/messages/:conversationId — returns messages', async () => {
  const res = await request(app)
    .get(`/api/messages/${conversationId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body.messages)).toBe(true);
});

// 9. Edit message
test('PUT /api/messages/:messageId — edits a message', async () => {
  const res = await request(app)
    .put(`/api/messages/${messageId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Edited message text' });
  expect(res.statusCode).toBe(200);
  expect(res.body.message.isEdited).toBe(true);
});

// 10. Delete message
test('DELETE /api/messages/:messageId — deletes a message', async () => {
  const res = await request(app)
    .delete(`/api/messages/${messageId}`)
    .set('Authorization', `Bearer ${token}`);
  expect(res.statusCode).toBe(200);
});

// 11. Group authorization — non-member cannot access
test('GET /api/messages/:conversationId — 404 for non-member', async () => {
  // Register a second user
  const user2 = { name: 'User Two', username: `user2_${Date.now()}`, email: `user2_${Date.now()}@example.com`, password: 'password123' };
  const regRes = await request(app).post('/api/auth/register').send(user2);
  const token2 = regRes.body.token;

  const res = await request(app)
    .get(`/api/messages/${conversationId}`)
    .set('Authorization', `Bearer ${token2}`);
  expect(res.statusCode).toBe(404);

  // Clean up user2
  await mongoose.connection.collection('users').deleteMany({ email: user2.email });
});
