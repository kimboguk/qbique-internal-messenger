import { useRef, useState } from 'react';
import api from '../../hooks/useApi';

interface FileUploadButtonProps {
  onUpload: () => void;
}

export default function FileUploadButton({ onUpload }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/corporate-forms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpload();
    } catch (err: any) {
      const msg = err.response?.data?.error || '파일 업로드에 실패했습니다.';
      alert(msg);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      // 같은 파일 재업로드 허용
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc,.pdf,.xlsx,.xls,.hwp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        style={{
          padding: '0.5rem 1rem', background: '#1976d2', color: '#fff',
          border: 'none', borderRadius: '4px', cursor: uploading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold', opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? '업로드 중...' : '파일 업로드'}
      </button>
    </>
  );
}
