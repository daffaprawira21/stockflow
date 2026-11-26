import { apiHandler } from '@/lib/api/api-handler';
import prisma from '@/lib/db';
import { getDashboardSummary } from '@/modules/dashboard/service';

export const GET = apiHandler({
  method: 'GET',
  auth: true,
  run: async () => {
    const summary = await getDashboardSummary(prisma);
    return { data: summary };
  },
}).handler;
