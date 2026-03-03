import { useEffect, useState } from 'react';
import api from '../../hooks/useApi';

interface PreviewModalProps {
  filename: string;
  onClose: () => void;
}

export default function PreviewModal({ filename, onClose }: PreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/corporate-forms/preview/${encodeURIComponent(filename)}`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        const url = URL.createObjectURL(response.data);
        setBlobUrl(url);
      } catch (err) {
        if (cancelled) return;
        setError('PDF를 불러올 수 없습니다.');
        console.error('Preview load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPdf();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [filename]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw', height: '85vh', background: '#fff', borderRadius: '8px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* 상단 바 */}
        <div style={{
          padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8f9fa',
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{filename}</span>
          <button
            onClick={onClose}
            style={{
              padding: '0.3rem 0.8rem', border: '1px solid #ddd', borderRadius: '4px',
              background: '#fff', cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            닫기
          </button>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
              PDF 로딩 중...
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#e53935' }}>
              {error}
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              title={filename}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
