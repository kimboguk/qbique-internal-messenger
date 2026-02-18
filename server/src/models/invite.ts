import db from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface InviteToken {
  id: string;
  token: string;
  created_by: string;
  used_by: string | null;
  expires_at: Date;
  is_used: boolean;
}

export const InviteModel = {
  async findByToken(token: string): Promise<InviteToken | undefined> {
    return db('invite_tokens').where({ token }).first();
  },

  async findAll(createdBy: string): Promise<InviteToken[]> {
    return db('invite_tokens')
      .where({ created_by: createdBy })
      .orderBy('expires_at', 'desc');
  },

  async create(createdBy: string): Promise<InviteToken> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간

    const [invite] = await db('invite_tokens')
      .insert({
        token,
        created_by: createdBy,
        expires_at: expiresAt,
      })
      .returning('*');
    return invite;
  },

  async markUsed(token: string, usedBy: string): Promise<void> {
    await db('invite_tokens')
      .where({ token })
      .update({ is_used: true, used_by: usedBy });
  },

  async isValid(token: string): Promise<boolean> {
    const invite = await db('invite_tokens').where({ token }).first();
    if (!invite) return false;
    if (invite.is_used) return false;
    if (new Date(invite.expires_at) < new Date()) return false;
    return true;
  },
};
