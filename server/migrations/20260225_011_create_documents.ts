import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title', 255).notNullable();
    table.enu('doc_type', ['freeform', 'form']).notNullable().defaultTo('freeform');
    table.text('content').nullable();
    table.uuid('template_id').nullable().references('id').inTable('form_templates').onDelete('SET NULL');
    table.uuid('category_id').nullable().references('id').inTable('document_categories').onDelete('SET NULL');
    table.enu('status', ['draft', 'pending', 'approved', 'rejected']).notNullable().defaultTo('draft');
    table.boolean('is_public').notNullable().defaultTo(false);
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.text('review_comment').nullable();
    table.timestamp('reviewed_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index('author_id');
    table.index('status');
    table.index('category_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('documents');
}
