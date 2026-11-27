import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/db', () => ({
  default: { $queryRaw: vi.fn() },
}));

import { GET } from '../../app/api/health/route';
import prisma from '../../lib/db';

describe('GET /api/health', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with healthy status when the database is reachable', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{}]);

    const response = await GET();
    const body = (await response.json()) as { success: boolean; data: { status: string; database: string } };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.database).toBe('connected');
  });

  it('returns 503 SERVICE_UNAVAILABLE when the database is unreachable', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET();
    const body = (await response.json()) as { success: boolean; error: { code: string; message: string } };

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toBe('A required service is temporarily unavailable');
  });
});
