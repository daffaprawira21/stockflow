import { requireAdmin } from '@/lib/api/guard';
import { jsonFromError, jsonSuccess } from '@/lib/api/response';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await requireAdmin(prisma, request);

    return jsonSuccess(user);
  } catch (error) {
    return jsonFromError(error);
  }
}
