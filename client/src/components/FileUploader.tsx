import { useRef, useState } from 'react';
import api from '../hooks/useApi';
import { useChatStore } from '../stores/chatStore';

interface FileUploaderProps {
  roomId: string;
}

export default function FileUploader({ roomId }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const addMessage = useChatStore((s) => s.addMessage);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB 제한 체크
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', roomId);

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Socket.IO로 전달되지 않는 REST 응답이므로 직접 추가
      if (data.message) {
        addMessage(data.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      // input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        title="파일 첨부"
        style={{
          padding: '0.5rem',
          background: 'none',
          border: '1px solid #ddd',
          borderRadius: '8px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize: '1.1rem',
          lineHeight: 1,
          color: '#666',
        }}
      >
        {uploading ? '...' : '\u{1F4CE}'}
      </button>
    </>
  );
}
