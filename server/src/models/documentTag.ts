import db from '../db';

export interface DocumentTag {
  id: string;
  name: string;
  created_at: Date;
}

export interface DocumentTagLink {
  id: string;
  document_id: string;
  tag_id: string;
}

export const DocumentTagModel = {
  async findAll(): Promise<DocumentTag[]> {
    return db('document_tags').orderBy('name', 'asc');
  },

  async findOrCreate(name: string): Promise<DocumentTag> {
    const existing = await db('document_tags').where({ name }).first();
    if (existing) return existing;
    const [tag] = await db('document_tags').insert({ name }).returning('*');
    return tag;
  },

  async setTagsForDocument(documentId: string, tagNames: string[]): Promise<DocumentTag[]> {
    // Remove existing links
    await db('document_tag_links').where({ document_id: documentId }).delete();

    if (tagNames.length === 0) return [];

    // Find or create each tag, then link
    const tags: DocumentTag[] = [];
    for (const name of tagNames) {
      const tag = await this.findOrCreate(name.trim());
      tags.push(tag);
      await db('document_tag_links')
        .insert({ document_id: documentId, tag_id: tag.id })
        .onConflict(['document_id', 'tag_id'])
        .ignore();
    }

    return tags;
  },

  async getTagsForDocument(documentId: string): Promise<DocumentTag[]> {
    return db('document_tags as t')
      .join('document_tag_links as tl', 't.id', 'tl.tag_id')
      .where('tl.document_id', documentId)
      .select('t.*');
  },
};
