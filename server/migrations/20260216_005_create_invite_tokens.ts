import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('invite_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('token', 255).notNullable().unique();
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('used_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.boolean('is_used').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('invite_tokens');
}
