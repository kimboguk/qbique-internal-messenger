import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Message } from '../types';
import { useAuthStore } from '../stores/authStore';

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => void;
}

export default function MessageBubble({ message, onDelete }: MessageBubbleProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const navigateFn = useNavigate();
  const isMine = message.sender_id === userId;
  const isSystem = message.message_type === 'system';
  const isFile = message.message_type === 'file';

  if (isSystem) {
    // Check for document link pattern: [문서] Title (/documents/uuid)
    const docLinkMatch = message.content.match(/\[문서\]\s*(.+?)\s*\(\/documents\/([a-f0-9-]+)\)/);
    if (docLinkMatch) {
      const docTitle = docLinkMatch[1];
      const docId = docLinkMatch[2];
      return (
        <div style={{ textAlign: 'center', margin: '0.5rem 0', color: '#999', fontSize: '0.8rem' }}>
          <span
            onClick={() => navigateFn(`/documents/${docId}`)}
            style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
          >
            [문서] {docTitle}
          </span>
        </div>
      );
    }

    return (
      <div style={{ textAlign: 'center', margin: '0.5rem 0', color: '#999', fontSize: '0.8rem' }}>
        {message.content}
      </div>
    );
  }

  const time = new Date(message.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [hovered, setHovered] = useState(false);

  const handleDelete = () => {
    if (onDelete && confirm('이 메시지를 삭제하시겠습니까?')) {
      onDelete(message.id);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        margin: '0.25rem 0',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 발신자 이름 (상대방 메시지만) */}
      {!isMine && (
        <span style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.15rem', marginLeft: '0.5rem' }}>
          {message.sender?.name}
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.3rem', flexDirection: isMine ? 'row-reverse' : 'row' }}>
        {/* 메시지 버블 */}
        <div style={{
          maxWidth: '70%',
          padding: '0.5rem 0.75rem',
          borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          background: isMine ? '#1976d2' : '#f0f0f0',
          color: isMine ? '#fff' : '#333',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          fontSize: '0.9rem',
        }}>
          {/* 텍스트 메시지 내용 (파일 메시지는 첨부파일 영역에서 표시) */}
          {!isFile && message.content}

          {/* 첨부파일 */}
          {message.attachments && message.attachments.length > 0 && (
            <div style={{ marginTop: isFile ? 0 : '0.3rem' }}>
              {message.attachments.map((att) => {
                const isImage = att.file_type.startsWith('image/');
                if (isImage) {
                  return (
                    <img
                      key={att.id}
                      src={`/uploads/${att.filepath}`}
                      alt={att.filename}
                      style={{ maxWidth: '200px', borderRadius: '4px', marginTop: '0.25rem', display: 'block' }}
                    />
                  );
                }
                return (
                  <a
                    key={att.id}
                    href={`/uploads/${att.filepath}`}
                    download={att.filename}
                    style={{ color: isMine ? '#bbdefb' : '#1976d2', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>&#128206;</span>
                    {att.filename}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* 시간 + 읽음 + 삭제 */}
        <div style={{ fontSize: '0.65rem', color: '#999', whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
          {isMine && hovered && onDelete && (
            <button
              onClick={handleDelete}
              style={{
                background: 'none',
                border: 'none',
                color: '#e53935',
                cursor: 'pointer',
                fontSize: '0.65rem',
                padding: 0,
                marginBottom: '0.1rem',
              }}
            >
              삭제
            </button>
          )}
          {isMine && message.is_read && (
            <span style={{ color: '#4caf50' }}>읽음</span>
          )}
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}
