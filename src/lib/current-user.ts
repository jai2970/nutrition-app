import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
