import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('form_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('description', 255).nullable();
    table.uuid('category_id').nullable().references('id').inTable('document_categories').onDelete('SET NULL');
    table.jsonb('schema').notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('form_templates');
}
