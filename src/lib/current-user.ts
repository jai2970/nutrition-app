import { prisma } from "@/lib/prisma";

const CURRENT_USER_EMAIL = "chauhanjai900@gmail.com";

export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: CURRENT_USER_EMAIL },
  });
  if (user) return user;
  return prisma.user.create({ data: { email: CURRENT_USER_EMAIL } });
}
