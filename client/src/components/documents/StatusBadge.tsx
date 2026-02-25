interface StatusBadgeProps {
  status: 'draft' | 'pending' | 'approved' | 'rejected';
}

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: '임시저장', bg: '#eeeeee', color: '#616161' },
  pending: { label: '승인 대기', bg: '#fff3e0', color: '#e65100' },
  approved: { label: '승인됨', bg: '#e8f5e9', color: '#2e7d32' },
  rejected: { label: '반려됨', bg: '#ffebee', color: '#c62828' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <span style={{
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.8rem',
      background: config.bg,
      color: config.color,
      fontWeight: 500,
    }}>
      {config.label}
    </span>
  );
}
