import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.enu('role', ['ceo', 'member']).notNullable().defaultTo('member');
    table.string('password_hash', 255).notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_seen_at', { useTz: true }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
