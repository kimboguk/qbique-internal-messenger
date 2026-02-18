import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ai_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('room_id').nullable().references('id').inTable('chat_rooms').onDelete('SET NULL');
    table.enu('report_type', ['summary', 'search']).notNullable();
    table.text('query').notNullable();
    table.text('result').notNullable();
    table.date('date_from').nullable();
    table.date('date_to').nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_reports');
}
