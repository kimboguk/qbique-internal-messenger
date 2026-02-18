import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { aiApi } from '../hooks/useApi';

interface AIRoom {
  id: string;
  topic: string;
  ceo_name: string;
  member_name: string;
}

interface AIReport {
  id: string;
  report_type: string;
  query: string;
  member_name: string | null;
  topic: string | null;
  date_from: string | null;
  date_to: string | null;
  created_at: string;
}

const topicLabels: Record<string, string> = {
  operations: '법인 운영',
  feedback: '플랫폼 피드백',
};

export default function AIDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [tab, setTab] = useState<'summarize' | 'search' | 'report' | 'history'>('summarize');
  const [rooms, setRooms] = useState<AIRoom[]>([]);
  const [reports, setReports] = useState<AIReport[]>([]);

  // 공통 필터
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 검색어
  const [searchQuery, setSearchQuery] = useState('');

  // 결과
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 리포트 상세
  const [selectedReport, setSelectedReport] = useState<{ query: string; result: string } | null>(null);

  useEffect(() => {
    if (user?.role !== 'ceo') {
      navigate('/');
      return;
    }
    loadRooms();
    loadReports();
  }, []);

  const loadRooms = async () => {
    try {
      const { data } = await aiApi.get('/rooms');
      setRooms(data);
    } catch {}
  };

  const loadReports = async () => {
    try {
      const { data } = await aiApi.get('/reports');
      setReports(data);
    } catch {}
  };

  const handleSummarize = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const { data } = await aiApi.post('/summarize', {
        room_id: selectedRoomId || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        save: true,
      });
      setResult(data.result);
      loadReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || '요약 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setResult('');
    try {
      const { data } = await aiApi.post('/search', {
        query: searchQuery,
        room_id: selectedRoomId || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        save: true,
      });
      setResult(data.result);
      loadReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || '검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const { data } = await aiApi.post('/report', {
        room_id: selectedRoomId || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
      });
      setResult(data.result);
      loadReports();
    } catch (err: any) {
      setError(err.response?.data?.detail || '리포트 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportId: string) => {
    try {
      const { data } = await aiApi.get(`/reports/${reportId}`);
      setSelectedReport({ query: data.query, result: data.result });
    } catch {}
  };

  const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!confirm('이 리포트를 삭제하시겠습니까?')) return;
    try {
      await aiApi.delete(`/reports/${reportId}`);
      loadReports();
    } catch {}
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem',
  };

  const btnStyle: React.CSSProperties = {
    padding: '0.5rem 1.5rem', background: '#1976d2', color: '#fff',
    border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>AI 대시보드</h1>
        <button onClick={() => navigate('/')} style={{ ...btnStyle, background: '#fff', color: '#333', border: '1px solid #ddd' }}>
          채팅으로 돌아가기
        </button>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '2px solid #e0e0e0' }}>
        {([['summarize', '대화 요약'], ['search', '대화 검색'], ['report', '종합 리포트'], ['history', '리포트 이력']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setResult(''); setError(''); setSelectedReport(null); }}
            style={{
              padding: '0.6rem 1.2rem', border: 'none', borderBottom: tab === key ? '2px solid #1976d2' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontWeight: tab === key ? 'bold' : 'normal',
              color: tab === key ? '#1976d2' : '#666', fontSize: '0.95rem', marginBottom: '-2px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 필터 (요약/검색/리포트 공통) */}
      {tab !== 'history' && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>채팅방</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              style={{ ...inputStyle, minWidth: '180px' }}
            >
              <option value="">전체 채팅방</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.member_name} - {topicLabels[r.topic] || r.topic}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>시작일</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>종료일</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>

          {tab === 'search' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>검색어</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색할 내용을 입력하세요..."
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              />
            </div>
          )}

          <button
            onClick={tab === 'summarize' ? handleSummarize : tab === 'search' ? handleSearch : handleReport}
            disabled={loading}
            style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'AI 분석 중...' : tab === 'summarize' ? '요약 생성' : tab === 'search' ? '검색' : '리포트 생성'}
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI 분석 중...</div>
          <div style={{ fontSize: '0.85rem' }}>Ollama 모델이 응답을 생성하고 있습니다. 잠시만 기다려주세요.</div>
        </div>
      )}

      {/* 결과 표시 */}
      {result && !loading && (
        <div style={{
          background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
          padding: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem',
        }}>
          {result}
        </div>
      )}

      {/* 리포트 이력 */}
      {tab === 'history' && !selectedReport && (
        <div>
          {reports.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>저장된 리포트가 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleViewReport(r.id)}
                  style={{
                    padding: '0.75rem 1rem', border: '1px solid #eee', borderRadius: '6px',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {r.report_type === 'summary' ? '요약' : '검색'}: {r.query}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>
                      {r.member_name && `${r.member_name} `}
                      {r.topic && `(${topicLabels[r.topic] || r.topic})`}
                      {r.date_from && ` | ${r.date_from}`}
                      {r.date_to && ` ~ ${r.date_to}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#999' }}>
                      {new Date(r.created_at).toLocaleString('ko-KR')}
                    </span>
                    <button
                      onClick={(e) => handleDeleteReport(e, r.id)}
                      style={{
                        padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#fff',
                        color: '#d32f2f', border: '1px solid #d32f2f', borderRadius: '4px', cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 리포트 상세 보기 */}
      {tab === 'history' && selectedReport && (
        <div>
          <button
            onClick={() => setSelectedReport(null)}
            style={{ ...btnStyle, background: '#fff', color: '#333', border: '1px solid #ddd', marginBottom: '1rem' }}
          >
            목록으로 돌아가기
          </button>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>{selectedReport.query}</div>
          <div style={{
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px',
            padding: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem',
          }}>
            {selectedReport.result}
          </div>
        </div>
      )}
    </div>
  );
}
