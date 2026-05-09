import { eq } from "drizzle-orm";

import { db } from "../client";
import { users } from "../schema";

export class UsersRepository {
  async findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  }

  async findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  }

  async create(input: {
    id: string;
    fullName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    currencyCode?: string;
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
