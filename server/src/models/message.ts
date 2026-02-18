import db from '../db';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system';
  is_read: boolean;
  is_deleted: boolean;
  created_at: Date;
}

export const MessageModel = {
  async create(data: {
    room_id: string;
    sender_id: string;
    content: string;
    message_type?: 'text' | 'file' | 'system';
  }): Promise<Message> {
    const [message] = await db('messages')
      .insert({
        room_id: data.room_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type || 'text',
      })
      .returning('*');
    return message;
  },

  async findByRoom(
    roomId: string,
    options: { limit?: number; before?: string } = {}
  ): Promise<Message[]> {
    const limit = options.limit || 50;
    let query = db('messages')
      .where({ room_id: roomId, is_deleted: false })
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (options.before) {
      query = query.where('created_at', '<', options.before);
    }

    const messages = await query;
    return messages.reverse();
  },

  async markAsRead(roomId: string, readerId: string): Promise<number> {
    const count = await db('messages')
      .where({ room_id: roomId, is_read: false })
      .whereNot({ sender_id: readerId })
      .update({ is_read: true });
    return count;
  },

  async getUnreadCount(roomId: string, userId: string): Promise<number> {
    const result = await db('messages')
      .where({ room_id: roomId, is_read: false, is_deleted: false })
      .whereNot({ sender_id: userId })
      .count('id as count')
      .first();
    return parseInt(String(result?.count || '0'), 10);
  },

  async findById(messageId: string): Promise<Message | undefined> {
    return db('messages').where({ id: messageId }).first();
  },

  async deleteMessage(messageId: string, senderId: string): Promise<boolean> {
    const message = await db('messages').where({ id: messageId }).first();
    if (!message || message.sender_id !== senderId) return false;

    await db('messages').where({ id: messageId }).update({ is_deleted: true });
    return true;
  },
};
