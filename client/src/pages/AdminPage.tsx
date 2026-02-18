import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../hooks/useApi';
import type { User } from '../types';

interface InviteToken {
  id: string;
  token: string;
  is_used: boolean;
  used_by: string | null;
  expires_at: string;
  is_expired: boolean;
}

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [members, setMembers] = useState<User[]>([]);
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // CEO 전용 페이지
  useEffect(() => {
    if (user?.role !== 'ceo') {
      navigate('/');
      return;
    }
    loadMembers();
    loadInvites();
  }, []);

  const loadMembers = async () => {
    const { data } = await api.get('/users');
    setMembers(data);
  };

  const loadInvites = async () => {
    const { data } = await api.get('/invites');
    setInvites(data);
  };

  const handleToggleActive = async (memberId: string, isActive: boolean) => {
    await api.patch(`/users/${memberId}`, { is_active: !isActive });
    loadMembers();
  };

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      await api.post('/invites');
      loadInvites();
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `http://100.99.64.32:5174/register/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>QIM 관리</h1>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
        >
          채팅으로 돌아가기
        </button>
      </div>

      {/* 구성원 관리 */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ borderBottom: '2px solid #1976d2', paddingBottom: '0.5rem' }}>구성원 관리</h2>
        {members.length === 0 ? (
          <p style={{ color: '#999' }}>등록된 구성원이 없습니다. 초대 링크를 생성하여 구성원을 초대하세요.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>이름</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>이메일</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>상태</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>가입일</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{m.name}</td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666' }}>{m.email}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                      background: m.is_active ? '#e8f5e9' : '#ffebee',
                      color: m.is_active ? '#2e7d32' : '#c62828',
                    }}>
                      {m.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <button
                      onClick={() => handleToggleActive(m.id, !!m.is_active)}
                      style={{
                        padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '4px',
                        background: m.is_active ? '#ffebee' : '#e8f5e9', cursor: 'pointer', fontSize: '0.8rem',
                      }}
                    >
                      {m.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 초대 링크 */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1976d2', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>초대 링크</h2>
          <button
            onClick={handleCreateInvite}
            disabled={creating}
            style={{
              padding: '0.5rem 1rem', background: '#1976d2', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 'bold',
            }}
          >
            {creating ? '생성 중...' : '새 초대 링크'}
          </button>
        </div>

        {invites.length === 0 ? (
          <p style={{ color: '#999' }}>생성된 초대 링크가 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {invites.map((inv) => {
              const isExpired = inv.is_expired || inv.is_used;
              return (
                <div key={inv.id} style={{
                  padding: '0.75rem', border: '1px solid #eee', borderRadius: '6px',
                  background: isExpired ? '#fafafa' : '#fff',
                  opacity: isExpired ? 0.6 : 1,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <code style={{ fontSize: '0.8rem', color: '#666' }}>{inv.token.slice(0, 8)}...</code>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.2rem' }}>
                      만료: {new Date(inv.expires_at).toLocaleString('ko-KR')}
                      {inv.is_used && ' | 사용됨'}
                      {inv.is_expired && !inv.is_used && ' | 만료됨'}
                    </div>
                  </div>
                  {!isExpired && (
                    <button
                      onClick={() => copyInviteLink(inv.token)}
                      style={{
                        padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '4px',
                        background: copied === inv.token ? '#e8f5e9' : '#fff', cursor: 'pointer', fontSize: '0.8rem',
                      }}
                    >
                      {copied === inv.token ? '복사됨!' : '링크 복사'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
