import db from '../db';

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: Date;
}

export const DocumentCategoryModel = {
  async findAll(): Promise<DocumentCategory[]> {
    return db('document_categories')
      .where({ is_active: true })
      .orderBy('sort_order', 'asc');
  },

  async findById(id: string): Promise<DocumentCategory | undefined> {
    return db('document_categories').where({ id }).first();
  },

  async create(data: { name: string; description?: string; sort_order?: number; created_by: string }): Promise<DocumentCategory> {
    const [category] = await db('document_categories').insert(data).returning('*');
    return category;
  },

  async update(id: string, data: { name?: string; description?: string; sort_order?: number; is_active?: boolean }): Promise<DocumentCategory | undefined> {
    const [category] = await db('document_categories').where({ id }).update(data).returning('*');
    return category;
  },

  async delete(id: string): Promise<void> {
    await db('document_categories').where({ id }).delete();
  },
};
