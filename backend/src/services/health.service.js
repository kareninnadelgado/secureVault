import { db } from '../prisma/db.ts';

export async function checkDatabase() {
  const users = await db.orm.public.User.all();

  return {
    users: users.length,
  };
}