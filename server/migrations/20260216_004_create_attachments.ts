import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    table.string('filename', 255).notNullable();
    table.string('filepath', 512).notNullable();
    table.string('file_type', 50).notNullable();
    table.bigInteger('file_size').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attachments');
}
