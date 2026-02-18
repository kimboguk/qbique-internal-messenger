import db from '../db';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ceo' | 'member';
  password_hash: string;
  is_active: boolean;
  created_at: Date;
  last_seen_at: Date | null;
}

export type UserPublic = Omit<User, 'password_hash'>;

export const UserModel = {
  async findById(id: string): Promise<User | undefined> {
    return db('users').where({ id }).first();
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  },

  async findCeo(): Promise<User | undefined> {
    return db('users').where({ role: 'ceo' }).first();
  },

  async findAllMembers(): Promise<UserPublic[]> {
    return db('users')
      .where({ role: 'member' })
      .select('id', 'name', 'email', 'role', 'is_active', 'created_at', 'last_seen_at')
      .orderBy('created_at', 'asc');
  },

  async create(data: { name: string; email: string; role: 'ceo' | 'member'; password_hash: string }): Promise<User> {
    const [user] = await db('users').insert(data).returning('*');
    return user;
  },

  async updateActive(id: string, isActive: boolean): Promise<UserPublic | undefined> {
    const [user] = await db('users')
      .where({ id })
      .update({ is_active: isActive })
      .returning(['id', 'name', 'email', 'role', 'is_active', 'created_at', 'last_seen_at']);
    return user;
  },

  async updateLastSeen(id: string): Promise<void> {
    await db('users').where({ id }).update({ last_seen_at: db.fn.now() });
  },
};
