import db from '../db';

export interface ChatRoom {
  id: string;
  ceo_id: string;
  member_id: string;
  topic: 'operations' | 'feedback';
  created_at: Date;
  last_message_at: Date | null;
}

export const ChatRoomModel = {
  async findById(id: string): Promise<ChatRoom | undefined> {
    return db('chat_rooms').where({ id }).first();
  },

  async findByUser(userId: string, role: 'ceo' | 'member'): Promise<ChatRoom[]> {
    const column = role === 'ceo' ? 'ceo_id' : 'member_id';
    return db('chat_rooms')
      .where({ [column]: userId })
      .orderBy('last_message_at', 'desc');
  },

  async createPair(ceoId: string, memberId: string): Promise<ChatRoom[]> {
    const rooms = await db('chat_rooms')
      .insert([
        { ceo_id: ceoId, member_id: memberId, topic: 'operations' },
        { ceo_id: ceoId, member_id: memberId, topic: 'feedback' },
      ])
      .returning('*');
    return rooms;
  },

  async updateLastMessage(roomId: string): Promise<void> {
    await db('chat_rooms').where({ id: roomId }).update({ last_message_at: db.fn.now() });
  },
};
