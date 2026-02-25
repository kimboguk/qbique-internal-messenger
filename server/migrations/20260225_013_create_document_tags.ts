import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_tags', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 50).notNullable().unique();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('document_tag_links', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.uuid('tag_id').notNullable().references('id').inTable('document_tags').onDelete('CASCADE');
    table.unique(['document_id', 'tag_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_tag_links');
  await knex.schema.dropTableIfExists('document_tags');
}
