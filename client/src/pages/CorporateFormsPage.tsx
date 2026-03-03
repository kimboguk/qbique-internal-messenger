import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../hooks/useApi';
import PreviewModal from '../components/corporate/PreviewModal';
import FileUploadButton from '../components/corporate/FileUploadButton';

interface FormFile {
  filename: string;
  size: number;
  sizeFormatted: string;
  modified: string;
  type: string;
  hasPdf: boolean;
}

const typeBadgeColors: Record<string, { bg: string; color: string }> = {
  docx: { bg: '#e3f2fd', color: '#1565c0' },
  doc: { bg: '#e3f2fd', color: '#1565c0' },
  pdf: { bg: '#fce4ec', color: '#c62828' },
  xlsx: { bg: '#e8f5e9', color: '#2e7d32' },
  xls: { bg: '#e8f5e9', color: '#2e7d32' },
  hwp: { bg: '#fff3e0', color: '#e65100' },
  other: { bg: '#f5f5f5', color: '#666' },
};

export default function CorporateFormsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isCeo = user?.role === 'ceo';

  const [files, setFiles] = useState<FormFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/corporate-forms');
      setFiles(data);
    } catch (err) {
      console.error('Load corporate forms error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDownload = async (filename: string) => {
    try {
      const response = await api.get(`/corporate-forms/download/${encodeURIComponent(filename)}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('다운로드에 실패했습니다.');
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`"${filename}" 파일을 정말 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/corporate-forms/${encodeURIComponent(filename)}`);
      loadFiles();
    } catch (err) {
      alert('삭제에 실패했습니다.');
      console.error('Delete error:', err);
    }
  };

  const canPreview = (file: FormFile) => {
    return file.type === 'pdf' || file.type === 'docx' || file.type === 'doc';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>법인 서식 관리</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isCeo && <FileUploadButton onUpload={loadFiles} />}
          <button
            onClick={() => navigate('/')}
            style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
          >
            채팅으로 돌아가기
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '3rem' }}>불러오는 중...</div>
      ) : files.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '3rem' }}>등록된 서식이 없습니다.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>파일명</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '70px' }}>유형</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '90px' }}>크기</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '110px' }}>수정일</th>
              <th style={{ padding: '0.75rem 0.5rem', width: isCeo ? '200px' : '140px' }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const badge = typeBadgeColors[file.type] || typeBadgeColors.other;
              return (
                <tr
                  key={file.filename}
                  style={{ borderBottom: '1px solid #eee' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                    {file.filename}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{
                      padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem',
                      fontWeight: 'bold', background: badge.bg, color: badge.color,
                    }}>
                      {file.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                    {file.sizeFormatted}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#666', fontSize: '0.85rem' }}>
                    {new Date(file.modified).toLocaleDateString('ko-KR')}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button
                        onClick={() => handleDownload(file.filename)}
                        style={{
                          padding: '0.25rem 0.6rem', border: '1px solid #ddd', borderRadius: '4px',
                          background: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                        }}
                      >
                        다운로드
                      </button>
                      {canPreview(file) && (
                        <button
                          onClick={() => setPreviewFile(file.filename)}
                          style={{
                            padding: '0.25rem 0.6rem', border: '1px solid #1976d2', borderRadius: '4px',
                            background: '#e3f2fd', cursor: 'pointer', fontSize: '0.8rem', color: '#1976d2',
                          }}
                        >
                          미리보기
                        </button>
                      )}
                      {isCeo && (
                        <button
                          onClick={() => handleDelete(file.filename)}
                          style={{
                            padding: '0.25rem 0.6rem', border: '1px solid #e53935', borderRadius: '4px',
                            background: '#ffebee', cursor: 'pointer', fontSize: '0.8rem', color: '#e53935',
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal filename={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
