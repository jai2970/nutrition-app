import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

// Just the signed-in user's id — one session lookup, no second query for the
// user row. Enough for actions that only need to know *who* (or whether)
// someone is signed in.
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
