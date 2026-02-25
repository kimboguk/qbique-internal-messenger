import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.string('filename', 255).notNullable();
    table.string('filepath', 512).notNullable();
    table.string('file_type', 50).nullable();
    table.bigInteger('file_size').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_attachments');
}
