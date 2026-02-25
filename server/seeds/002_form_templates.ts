import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex('form_templates').first();
  if (existing) {
    console.log('Form templates already exist, skipping seed.');
    return;
  }

  const ceo = await knex('users').where({ role: 'ceo' }).first();
  if (!ceo) {
    console.log('CEO user not found, skipping form templates seed.');
    return;
  }

  // 카테고리 ID 조회
  const leaveCategory = await knex('document_categories').where({ name: '휴가/경조사' }).first();
  const expenseCategory = await knex('document_categories').where({ name: '경비' }).first();
  const reportCategory = await knex('document_categories').where({ name: '업무 보고' }).first();

  const templates = [
    {
      name: '휴가신청서',
      description: '연차, 반차, 병가 등 휴가 신청',
      category_id: leaveCategory?.id || null,
      schema: JSON.stringify({
        fields: [
          { key: 'leave_type', label: '휴가 유형', type: 'select', options: ['연차', '반차(오전)', '반차(오후)', '병가', '경조사', '기타'], required: true },
          { key: 'start_date', label: '시작일', type: 'date', required: true },
          { key: 'end_date', label: '종료일', type: 'date', required: true },
          { key: 'reason', label: '사유', type: 'textarea', required: true },
        ],
      }),
      created_by: ceo.id,
    },
    {
      name: '지출결의서',
      description: '경비 지출 승인 요청',
      category_id: expenseCategory?.id || null,
      schema: JSON.stringify({
        fields: [
          { key: 'expense_date', label: '지출일', type: 'date', required: true },
          { key: 'amount', label: '금액 (원)', type: 'number', required: true },
          { key: 'expense_type', label: '지출 유형', type: 'select', options: ['교통비', '식대', '사무용품', '회의비', '출장비', '기타'], required: true },
          { key: 'description', label: '지출 내역', type: 'textarea', required: true },
          { key: 'payment_method', label: '결제 수단', type: 'select', options: ['법인카드', '개인카드(추후 정산)', '현금'], required: true },
        ],
      }),
      created_by: ceo.id,
    },
    {
      name: '업무보고서',
      description: '주간/월간 업무 보고',
      category_id: reportCategory?.id || null,
      schema: JSON.stringify({
        fields: [
          { key: 'report_period', label: '보고 기간', type: 'text', required: true },
          { key: 'completed_tasks', label: '완료 업무', type: 'textarea', required: true },
          { key: 'ongoing_tasks', label: '진행 중 업무', type: 'textarea', required: false },
          { key: 'planned_tasks', label: '계획 업무', type: 'textarea', required: false },
          { key: 'issues', label: '이슈 및 건의사항', type: 'textarea', required: false },
        ],
      }),
      created_by: ceo.id,
    },
  ];

  await knex('form_templates').insert(templates);
  console.log('Form templates seeded:', templates.map((t) => t.name).join(', '));
}
