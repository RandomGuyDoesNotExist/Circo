const request = require('supertest');
const { app, server } = require('../src/server');

describe('Realtime Service Unit Tests', () => {
  afterAll((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('GET /health', () => {
    it('should return 200 with service status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
      expect(res.body.service).toEqual('realtime-service');
      expect(res.body).toHaveProperty('connectedClients');
    });
  });

  describe('POST /broadcast validation', () => {
    it('should reject broadcast if event name is missing', async () => {
      const res = await request(app).post('/broadcast').send({
        data: { message: 'hello' }
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toMatch(/event name is required/i);
    });

    it('should successfully broadcast event to clients', async () => {
      const res = await request(app).post('/broadcast').send({
        event: 'resource:created',
        data: { title: 'Project_Design.pdf' }
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body.event).toEqual('resource:created');
    });
  });
});
