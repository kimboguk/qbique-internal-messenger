import type { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // 기존 CEO 계정이 없을 때만 삽입
  const existing = await knex('users').where({ role: 'ceo' }).first();
  if (existing) {
    console.log('CEO user already exists, skipping seed.');
    return;
  }

  const passwordHash = await bcrypt.hash('admin1234', 12);

  await knex('users').insert({
    name: '대표이사',
    email: 'bgkim@sufs.ac.kr',
    role: 'ceo',
    password_hash: passwordHash,
    is_active: true,
  });

  console.log('CEO user seeded: bgkim@sufs.ac.kr / admin1234');
}
