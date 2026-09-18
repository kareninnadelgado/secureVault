import { db } from '../prisma/db.ts';

export async function getUsers() {
  const users = await db.orm.public.User
    .include('role')
    .all();

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  }));
}