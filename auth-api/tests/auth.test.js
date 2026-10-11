const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock db module for clean unit tests during Docker test stage
jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { on: jest.fn() },
}));

const db = require('../src/db');
const app = require('../src/server');

describe('Auth API Unit & Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 with service status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.service).toEqual('auth-api');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /register validation', () => {
    it('should reject registration if email is missing', async () => {
      const res = await request(app).post('/register').send({
        username: 'testuser',
        password: 'password123',
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/email/i);
    });

    it('should reject registration if password is too short', async () => {
      const res = await request(app).post('/register').send({
        username: 'testuser',
        email: 'test@circle.com',
        password: '123',
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/at least 6 characters/i);
    });

    it('should hash the password and successfully register user', async () => {
      const fakeUser = {
        id: 1,
        username: 'alice',
        email: 'alice@circle.com',
        display_name: 'Alice Wonder',
        circle_name: 'Close Friends',
        bio: 'Hello world',
        avatar_url: '',
        created_at: new Date().toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [fakeUser] });

      const res = await request(app).post('/register').send({
        username: 'alice',
        email: 'alice@circle.com',
        password: 'securePassword123',
        displayName: 'Alice Wonder',
        circleName: 'Close Friends',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.user.email).toEqual('alice@circle.com');
      expect(res.body).toHaveProperty('token');

      // Verify that db.query received a hashed password, not the raw password
      const dbCallArgs = db.query.mock.calls[0][1];
      const rawPassword = 'securePassword123';
      const storedHash = dbCallArgs[2];
      expect(storedHash).not.toEqual(rawPassword);
      const isMatch = await bcrypt.compare(rawPassword, storedHash);
      expect(isMatch).toBe(true);
    });
  });

  describe('JWT and Auth Flow', () => {
    it('should sign and verify valid JWT tokens', () => {
      const payload = { id: 42, username: 'bob', email: 'bob@circle.com' };
      const secret = 'circle-super-secret-jwt-key-2026';
      const token = jwt.sign(payload, secret);
      const decoded = jwt.verify(token, secret);
      expect(decoded.username).toEqual('bob');
      expect(decoded.id).toEqual(42);
    });

    it('should deny access to protected profile route without token', async () => {
      const res = await request(app).get('/profile');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 404 from /circles/active if user belongs to no circles', async () => {
      const payload = { id: 99, username: 'charlie', email: 'charlie@circle.com' };
      const secret = 'circle-super-secret-jwt-key-2026';
      const token = jwt.sign(payload, secret);

      // Mock user lookup with no active circle
      db.query.mockResolvedValueOnce({ rows: [{ active_circle_id: null }] });
      // Mock circle_members check returning no circles
      db.query.mockResolvedValueOnce({ rows: [] });
      // Mock UPDATE users SET active_circle_id = NULL
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/circles/active')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toMatch(/no active circle/i);
    });
  });
});
