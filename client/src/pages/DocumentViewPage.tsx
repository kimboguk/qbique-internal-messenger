import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../hooks/useApi';
import type { Document, FormTemplate } from '../types';
import StatusBadge from '../components/documents/StatusBadge';
import FormRenderer from '../components/documents/FormRenderer';
import DocumentAttachments from '../components/documents/DocumentAttachments';
import ShareModal from '../components/documents/ShareModal';

export default function DocumentViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [doc, setDoc] = useState<Document | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (id) loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      setDoc(data);

      if (data.doc_type === 'form' && data.template_id) {
        try {
          const { data: tmpl } = await api.get(`/form-templates/${data.template_id}`);
          setTemplate(tmpl);
        } catch {
          // Template may have been deleted
        }
        try {
          setFormValues(JSON.parse(data.content || '{}'));
        } catch {
          setFormValues({});
        }
      }
    } catch (err) {
      console.error('Load document error:', err);
      navigate('/documents');
    }
  };

  const handleReview = async (action: 'approved' | 'rejected') => {
    setReviewing(true);
    try {
      await api.post(`/documents/${id}/review`, { action, comment: reviewComment });
      loadDocument();
      setReviewComment('');
    } catch (err) {
      console.error('Review error:', err);
      alert('검토 중 오류가 발생했습니다.');
    } finally {
      setReviewing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/documents/${id}`);
      navigate('/documents');
    } catch (err) {
      console.error('Delete error:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  if (!doc) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center', color: '#999' }}>
        로딩 중...
      </div>
    );
  }

  const isAuthor = doc.author_id === user?.id;
  const isCeo = user?.role === 'ceo';
  const canEdit = isAuthor && ['draft', 'rejected'].includes(doc.status);
  const canDelete = (isAuthor && doc.status === 'draft') || isCeo;
  const canReview = isCeo && doc.status === 'pending';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <StatusBadge status={doc.status} />
            {doc.doc_type === 'form' && (
              <span style={{ fontSize: '0.75rem', color: '#999', background: '#f5f5f5', padding: '0.15rem 0.4rem', borderRadius: '2px' }}>양식</span>
            )}
            {doc.is_public && (
              <span style={{ fontSize: '0.75rem', color: '#1565c0', background: '#e3f2fd', padding: '0.15rem 0.4rem', borderRadius: '2px' }}>전체 공개</span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{doc.title}</h1>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            {doc.author_name || doc.author?.name} &middot; {new Date(doc.created_at).toLocaleString('ko-KR')}
            {doc.category_name && <> &middot; {doc.category_name}</>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            onClick={() => setShowShareModal(true)}
            style={{ padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            채팅에 공유
          </button>
          {canEdit && (
            <button
              onClick={() => navigate(`/documents/${id}/edit`)}
              style={{ padding: '0.4rem 0.8rem', border: '1px solid #1976d2', borderRadius: '4px', background: '#e3f2fd', cursor: 'pointer', fontSize: '0.8rem', color: '#1976d2' }}
            >
              편집
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              style={{ padding: '0.4rem 0.8rem', border: '1px solid #e53935', borderRadius: '4px', background: '#ffebee', cursor: 'pointer', fontSize: '0.8rem', color: '#e53935' }}
            >
              삭제
            </button>
          )}
          <button
            onClick={() => navigate('/documents')}
            style={{ padding: '0.4rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            목록
          </button>
        </div>
      </div>

      {/* Tags */}
      {doc.tags && doc.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {doc.tags.map((tag) => (
            <span key={tag.id} style={{
              padding: '0.15rem 0.5rem', background: '#e3f2fd', color: '#1565c0',
              borderRadius: '12px', fontSize: '0.8rem',
            }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: '#fafafa', borderRadius: '8px', border: '1px solid #eee' }}>
        {doc.doc_type === 'freeform' ? (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
            {doc.content || '(내용 없음)'}
          </div>
        ) : template ? (
          <FormRenderer
            fields={template.schema.fields}
            values={formValues}
            readOnly
          />
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
            {doc.content || '(내용 없음)'}
          </div>
        )}
      </div>

      {/* Attachments */}
      {doc.attachments && (
        <div style={{ marginBottom: '1.5rem' }}>
          <DocumentAttachments
            documentId={doc.id}
            attachments={doc.attachments}
            onUpdate={loadDocument}
            readOnly={!canEdit}
          />
        </div>
      )}

      {/* Shares */}
      {doc.shares && doc.shares.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.3rem' }}>공유 대상</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {doc.shares.map((share) => (
              <span key={share.id} style={{
                padding: '0.2rem 0.5rem', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.8rem',
              }}>
                {share.user_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Review info */}
      {doc.reviewed_by && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem', borderRadius: '6px',
          background: doc.status === 'approved' ? '#e8f5e9' : '#ffebee',
          border: `1px solid ${doc.status === 'approved' ? '#c8e6c9' : '#ffcdd2'}`,
        }}>
          <div style={{ fontWeight: 500, marginBottom: '0.3rem' }}>
            {doc.status === 'approved' ? '승인됨' : '반려됨'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            {doc.reviewer_name} &middot; {doc.reviewed_at ? new Date(doc.reviewed_at).toLocaleString('ko-KR') : ''}
          </div>
          {doc.review_comment && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{doc.review_comment}</div>
          )}
        </div>
      )}

      {/* CEO Review section */}
      {canReview && (
        <div style={{
          padding: '1.5rem', background: '#fff3e0', borderRadius: '8px',
          border: '1px solid #ffe0b2',
        }}>
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>문서 검토</h3>
          <textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="코멘트 (선택사항)"
            rows={3}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical', marginBottom: '0.75rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => handleReview('rejected')}
              disabled={reviewing}
              style={{
                padding: '0.5rem 1.5rem', border: '1px solid #e53935', borderRadius: '4px',
                background: '#ffebee', color: '#e53935', cursor: reviewing ? 'not-allowed' : 'pointer', fontWeight: 'bold',
              }}
            >
              반려
            </button>
            <button
              onClick={() => handleReview('approved')}
              disabled={reviewing}
              style={{
                padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px',
                background: '#2e7d32', color: '#fff', cursor: reviewing ? 'not-allowed' : 'pointer', fontWeight: 'bold',
              }}
            >
              승인
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          documentId={doc.id}
          documentTitle={doc.title}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
