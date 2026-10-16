import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('SkillBridge API', () => {
  it('reports health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('protects private candidate data', async () => {
    const response = await request(app).get('/api/candidate/profile');
    expect(response.status).toBe(401);
  });

  it('logs in the seeded candidate with an HTTP-only cookie', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'candidate@skillbridge.demo',
      password: 'Demo123!'
    });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('CANDIDATE');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'candidate@skillbridge.demo',
      password: 'wrong'
    });
    expect(response.status).toBe(401);
  });
});
