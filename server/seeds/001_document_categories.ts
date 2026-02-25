import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('document_categories').first();
  if (existing) {
    console.log('Document categories already exist, skipping seed.');
    return;
  }

  // CEO 사용자를 created_by로 사용
  const ceo = await knex('users').where({ role: 'ceo' }).first();
  if (!ceo) {
    console.log('CEO user not found, skipping document categories seed.');
    return;
  }

  const categories = [
    { name: '공지사항', description: '전사 공지 및 안내', sort_order: 1, created_by: ceo.id },
    { name: '회의록', description: '회의 기록 및 회의록', sort_order: 2, created_by: ceo.id },
    { name: '업무 보고', description: '업무 진행 보고서', sort_order: 3, created_by: ceo.id },
    { name: '휴가/경조사', description: '휴가신청서, 경조사 관련', sort_order: 4, created_by: ceo.id },
    { name: '경비', description: '지출결의서, 경비 관련', sort_order: 5, created_by: ceo.id },
    { name: '기타', description: '기타 문서', sort_order: 6, created_by: ceo.id },
  ];

  await knex('document_categories').insert(categories);
  console.log('Document categories seeded:', categories.map((c) => c.name).join(', '));
}
