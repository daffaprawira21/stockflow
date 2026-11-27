import { jsonSuccess, jsonError } from '@/lib/api/response';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonSuccess({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return jsonError('SERVICE_UNAVAILABLE');
  }
}
