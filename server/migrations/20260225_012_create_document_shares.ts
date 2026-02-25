import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_shares', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['document_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_shares');
}
