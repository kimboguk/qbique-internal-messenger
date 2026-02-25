import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../stores/documentStore';
import api from '../hooks/useApi';
import StatusBadge from '../components/documents/StatusBadge';

export default function DocumentsPage() {
  const navigate = useNavigate();
  const {
    documents, totalDocuments, categories, tags, filters,
    setDocuments, setCategories, setTags, setFilters,
  } = useDocumentStore();

  const totalPages = Math.ceil(totalDocuments / filters.limit);

  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      const params: Record<string, string | number> = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.tag_id) params.tag_id = filters.tag_id;
      if (filters.search) params.search = filters.search;
      if (filters.doc_type) params.doc_type = filters.doc_type;

      const { data } = await api.get('/documents', { params });
      setDocuments(data.documents, data.total);
    } catch (err) {
      console.error('Load documents error:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/document-categories');
      setCategories(data);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  };

  const loadTags = async () => {
    // Tags are loaded from documents; no separate endpoint needed
    // We can just keep existing tags from the store
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>문서 관리</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/documents/new')}
            style={{ padding: '0.5rem 1rem', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            새 문서
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
          >
            채팅으로 돌아가기
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filters.status || ''}
          onChange={(e) => setFilters({ status: e.target.value || undefined, page: 1 })}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}
        >
          <option value="">모든 상태</option>
          <option value="draft">임시저장</option>
          <option value="pending">승인 대기</option>
          <option value="approved">승인됨</option>
          <option value="rejected">반려됨</option>
        </select>

        <select
          value={filters.category_id || ''}
          onChange={(e) => setFilters({ category_id: e.target.value || undefined, page: 1 })}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}
        >
          <option value="">모든 카테고리</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select
          value={filters.doc_type || ''}
          onChange={(e) => setFilters({ doc_type: e.target.value || undefined, page: 1 })}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}
        >
          <option value="">모든 유형</option>
          <option value="freeform">자유 문서</option>
          <option value="form">양식 문서</option>
        </select>

        <input
          type="text"
          placeholder="검색..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ search: e.target.value || undefined, page: 1 })}
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', flex: 1, minWidth: '150px' }}
        />
      </div>

      {/* Table */}
      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '3rem' }}>
          문서가 없습니다.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>제목</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>작성자</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>카테고리</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>상태</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>작성일</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>태그</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                  {doc.title}
                  {doc.doc_type === 'form' && (
                    <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', color: '#999', background: '#f5f5f5', padding: '0.1rem 0.3rem', borderRadius: '2px' }}>양식</span>
                  )}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                  {doc.author?.name || doc.author_name || '-'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                  {doc.category?.name || doc.category_name || '-'}
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <StatusBadge status={doc.status} />
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                  {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                    {doc.tags?.map((tag) => (
                      <span key={tag.id} style={{
                        padding: '0.1rem 0.4rem', background: '#e3f2fd', color: '#1565c0',
                        borderRadius: '10px', fontSize: '0.7rem',
                      }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setFilters({ page: filters.page - 1 })}
            disabled={filters.page <= 1}
            style={{
              padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px',
              background: '#fff', cursor: filters.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}
          >
            이전
          </button>
          <span style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#666' }}>
            {filters.page} / {totalPages}
          </span>
          <button
            onClick={() => setFilters({ page: filters.page + 1 })}
            disabled={filters.page >= totalPages}
            style={{
              padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px',
              background: '#fff', cursor: filters.page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem',
            }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
