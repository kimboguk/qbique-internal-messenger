import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chat_rooms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('ceo_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('member_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enu('topic', ['operations', 'feedback']).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_message_at', { useTz: true }).nullable();

    // 구성원당 주제별 1개 채팅방
    table.unique(['ceo_id', 'member_id', 'topic']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_rooms');
}
