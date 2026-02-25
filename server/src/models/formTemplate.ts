import db from '../db';

export interface FormTemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  options?: string[];
  required?: boolean;
}

export interface FormTemplateSchema {
  fields: FormTemplateField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  schema: FormTemplateSchema;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export const FormTemplateModel = {
  async findAll(): Promise<FormTemplate[]> {
    return db('form_templates')
      .where({ is_active: true })
      .orderBy('name', 'asc');
  },

  async findById(id: string): Promise<FormTemplate | undefined> {
    return db('form_templates').where({ id }).first();
  },

  async create(data: {
    name: string;
    description?: string;
    category_id?: string;
    schema: FormTemplateSchema;
    created_by: string;
  }): Promise<FormTemplate> {
    const [template] = await db('form_templates')
      .insert({ ...data, schema: JSON.stringify(data.schema) })
      .returning('*');
    return template;
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    category_id?: string | null;
    schema?: FormTemplateSchema;
    is_active?: boolean;
  }): Promise<FormTemplate | undefined> {
    const updateData: Record<string, unknown> = { ...data, updated_at: db.fn.now() };
    if (data.schema) {
      updateData.schema = JSON.stringify(data.schema);
    }
    const [template] = await db('form_templates').where({ id }).update(updateData).returning('*');
    return template;
  },

  async delete(id: string): Promise<void> {
    await db('form_templates').where({ id }).delete();
  },
};
