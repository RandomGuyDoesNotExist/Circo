const request = require('supertest');

// Mock db module
jest.mock('../src/db', () => ({
  query: jest.fn(),
  pool: { on: jest.fn() },
}));

const db = require('../src/db');
const app = require('../src/server');

describe('Resource API Unit & Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 with service status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.service).toEqual('resource-api');
    });
  });

  describe('POST /upload validation', () => {
    it('should reject resource creation if title is missing', async () => {
      const res = await request(app).post('/upload').send({
        description: 'Test file without title',
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/title is required/i);
    });

    it('should successfully create resource record with valid title', async () => {
      const fakeResource = {
        id: 10,
        title: 'Project Guidelines.pdf',
        description: 'Semester finals guide',
        category: 'Documents',
        file_path: 'mock_path.pdf',
        file_name: 'Project Guidelines.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        user_id: 1,
        circle_name: 'Friends Circle',
        created_at: new Date().toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [fakeResource] });

      const res = await request(app).post('/upload').send({
        title: 'Project Guidelines.pdf',
        description: 'Semester finals guide',
        category: 'Documents',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.resource.title).toEqual('Project Guidelines.pdf');
    });
  });

  describe('POST /:id/notes validation', () => {
    it('should reject note creation if note content is empty', async () => {
      const res = await request(app).post('/10/notes').send({
        content: '   ',
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/content cannot be empty/i);
    });

    it('should successfully add note to resource', async () => {
      const fakeNote = {
        id: 101,
        resource_id: 10,
        user_id: 1,
        content: 'Check page 4 for CI/CD requirements',
        created_at: new Date().toISOString(),
      };

      db.query.mockResolvedValueOnce({ rows: [fakeNote] }); // Insert note
      db.query.mockResolvedValueOnce({ rows: [{ display_name: 'Bob', username: 'bob' }] }); // Author lookup

      const res = await request(app).post('/10/notes').send({
        content: 'Check page 4 for CI/CD requirements',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.note.content).toEqual('Check page 4 for CI/CD requirements');
      expect(res.body.note.author_name).toEqual('Bob');
    });
  });
});
