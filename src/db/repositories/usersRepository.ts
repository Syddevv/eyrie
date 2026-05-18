import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../client";
import { users } from "../schema";

export class UsersRepository {
  async findById(id: string) {
    return db.query.users.findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)) });
  }

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const [match] = await db
      .select()
      .from(users)
      .where(
        and(
          sql`lower(trim(${users.email})) = ${normalizedEmail}`,
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return match ?? null;
  }

  async create(input: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    currencyCode?: string;
    currentStreak?: number;
    lastActiveDate?: string | null;
    longestStreak?: number;
    createdAt: string;
    updatedAt: string;
  }) {
    await db.insert(users).values(input as any);
    return this.findById(input.id);
  }

  async update(id: string, input: Partial<Record<string, any>>) {
    await db.update(users).set(input).where(eq(users.id, id));
    return this.findById(id);
  }

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const usersRepository = new UsersRepository();
