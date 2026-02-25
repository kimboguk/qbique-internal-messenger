import { useRef } from 'react';
import type { DocumentAttachment } from '../../types';
import api from '../../hooks/useApi';

interface DocumentAttachmentsProps {
  documentId: string;
  attachments: DocumentAttachment[];
  onUpdate: () => void;
  readOnly?: boolean;
}

export default function DocumentAttachments({ documentId, attachments, onUpdate, readOnly }: DocumentAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/documents/${documentId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpdate();
    } catch (err) {
      console.error('Upload error:', err);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('이 첨부파일을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/documents/${documentId}/attachments/${attachmentId}`);
      onUpdate();
    } catch (err) {
      console.error('Delete attachment error:', err);
      alert('첨부파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>첨부파일 ({attachments.length})</span>
        {!readOnly && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              파일 추가
            </button>
            <input ref={fileInputRef} type="file" onChange={handleUpload} style={{ display: 'none' }} />
          </>
        )}
      </div>

      {attachments.length === 0 ? (
        <div style={{ color: '#999', fontSize: '0.85rem' }}>첨부파일이 없습니다.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {attachments.map((att) => (
            <div key={att.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.4rem 0.6rem', background: '#f5f5f5', borderRadius: '4px',
            }}>
              <a
                href={`/uploads/${att.filepath}`}
                download={att.filename}
                style={{ color: '#1976d2', textDecoration: 'none', fontSize: '0.85rem', flex: 1 }}
              >
                {att.filename}
                {att.file_size && (
                  <span style={{ color: '#999', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                    ({formatSize(att.file_size)})
                  </span>
                )}
              </a>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(att.id)}
                  style={{ background: 'none', border: 'none', color: '#e53935', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
