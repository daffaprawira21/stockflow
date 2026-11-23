import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';
import prisma from '@/lib/db';
import { getDashboardSummary } from '@/modules/dashboard/service';

export async function GET(request: Request) {
  try {
    await requireAdmin(prisma, request);
    const summary = await getDashboardSummary(prisma);
    return jsonSuccess(summary);
  } catch (error) {
    return jsonFromError(error);
  }
}
