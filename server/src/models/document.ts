import db from '../db';

export interface Document {
  id: string;
  title: string;
  doc_type: 'freeform' | 'form';
  content: string | null;
  template_id: string | null;
  category_id: string | null;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  is_public: boolean;
  author_id: string;
  reviewed_by: string | null;
  review_comment: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  user_id: string;
  created_at: Date;
}

export interface DocumentAttachment {
  id: string;
  document_id: string;
  filename: string;
  filepath: string;
  file_type: string | null;
  file_size: number | null;
  created_at: Date;
}

interface DocumentFilters {
  status?: string;
  category_id?: string;
  tag_id?: string;
  search?: string;
  doc_type?: string;
  page?: number;
  limit?: number;
}

export const DocumentModel = {
  async findAccessible(
    userId: string,
    role: 'ceo' | 'member',
    filters: DocumentFilters = {}
  ): Promise<{ documents: Document[]; total: number }> {
    const { status, category_id, tag_id, search, doc_type, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = db('documents as d')
      .select('d.*')
      .distinct();

    // Access control: CEO sees all, member sees own + public + shared
    if (role !== 'ceo') {
      query = query.leftJoin('document_shares as ds', function () {
        this.on('ds.document_id', 'd.id').andOn('ds.user_id', db.raw('?', [userId]));
      }).where(function () {
        this.where('d.author_id', userId)
          .orWhere('d.is_public', true)
          .orWhereNotNull('ds.id');
      });
    }

    // Filters
    if (status) query = query.where('d.status', status);
    if (category_id) query = query.where('d.category_id', category_id);
    if (doc_type) query = query.where('d.doc_type', doc_type);
    if (search) {
      query = query.where(function () {
        this.whereILike('d.title', `%${search}%`)
          .orWhereILike('d.content', `%${search}%`);
      });
    }
    if (tag_id) {
      query = query.join('document_tag_links as dtl', 'd.id', 'dtl.document_id')
        .where('dtl.tag_id', tag_id);
    }

    // Count total
    const countQuery = query.clone().clearSelect().clearOrder().count('* as count').first();
    const countResult = await countQuery as unknown as { count: string };
    const total = parseInt(countResult.count, 10);

    // Fetch page
    const documents = await query
      .orderBy('d.updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { documents, total };
  },

  async findById(id: string): Promise<Document | undefined> {
    return db('documents').where({ id }).first();
  },

  async findByIdWithDetails(id: string): Promise<Record<string, unknown> | undefined> {
    const doc = await db('documents as d')
      .join('users as u', 'd.author_id', 'u.id')
      .leftJoin('document_categories as c', 'd.category_id', 'c.id')
      .leftJoin('users as r', 'd.reviewed_by', 'r.id')
      .where('d.id', id)
      .select(
        'd.*',
        'u.name as author_name',
        'u.email as author_email',
        'c.name as category_name',
        'r.name as reviewer_name'
      )
      .first();

    return doc;
  },

  async create(data: {
    title: string;
    doc_type: 'freeform' | 'form';
    content?: string;
    template_id?: string;
    category_id?: string;
    status?: 'draft' | 'pending';
    is_public?: boolean;
    author_id: string;
  }): Promise<Document> {
    const [doc] = await db('documents').insert(data).returning('*');
    return doc;
  },

  async update(id: string, data: {
    title?: string;
    content?: string;
    category_id?: string | null;
    is_public?: boolean;
  }): Promise<Document | undefined> {
    const [doc] = await db('documents')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return doc;
  },

  async delete(id: string): Promise<void> {
    await db('documents').where({ id }).delete();
  },

  async submit(id: string): Promise<Document | undefined> {
    const [doc] = await db('documents')
      .where({ id })
      .whereIn('status', ['draft', 'rejected'])
      .update({ status: 'pending', updated_at: db.fn.now() })
      .returning('*');
    return doc;
  },

  async review(
    id: string,
    reviewerId: string,
    action: 'approved' | 'rejected',
    comment?: string
  ): Promise<Document | undefined> {
    const [doc] = await db('documents')
      .where({ id, status: 'pending' })
      .update({
        status: action,
        reviewed_by: reviewerId,
        review_comment: comment || null,
        reviewed_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    return doc;
  },

  // Shares
  async getShares(documentId: string): Promise<Array<{ id: string; user_id: string; user_name: string; user_email: string }>> {
    return db('document_shares as ds')
      .join('users as u', 'ds.user_id', 'u.id')
      .where('ds.document_id', documentId)
      .select('ds.id', 'ds.user_id', 'u.name as user_name', 'u.email as user_email');
  },

  async share(documentId: string, userIds: string[]): Promise<void> {
    // Remove existing shares first
    await db('document_shares').where({ document_id: documentId }).delete();
    if (userIds.length === 0) return;
    const rows = userIds.map((userId) => ({ document_id: documentId, user_id: userId }));
    await db('document_shares').insert(rows).onConflict(['document_id', 'user_id']).ignore();
  },

  async unshare(documentId: string, userId: string): Promise<void> {
    await db('document_shares').where({ document_id: documentId, user_id: userId }).delete();
  },

  async hasAccess(documentId: string, userId: string, role: 'ceo' | 'member'): Promise<boolean> {
    if (role === 'ceo') return true;

    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) return false;
    if (doc.author_id === userId) return true;
    if (doc.is_public) return true;

    const share = await db('document_shares')
      .where({ document_id: documentId, user_id: userId })
      .first();
    return !!share;
  },

  // Attachments
  async getAttachments(documentId: string): Promise<DocumentAttachment[]> {
    return db('document_attachments').where({ document_id: documentId }).orderBy('created_at', 'asc');
  },

  async addAttachment(data: {
    document_id: string;
    filename: string;
    filepath: string;
    file_type?: string;
    file_size?: number;
  }): Promise<DocumentAttachment> {
    const [att] = await db('document_attachments').insert(data).returning('*');
    return att;
  },

  async deleteAttachment(id: string): Promise<void> {
    await db('document_attachments').where({ id }).delete();
  },

  async findAttachment(id: string): Promise<DocumentAttachment | undefined> {
    return db('document_attachments').where({ id }).first();
  },
};
