import { useEffect, useState } from 'react';
import api from '../../hooks/useApi';
import type { ChatRoom } from '../../types';

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  onClose: () => void;
}

export default function ShareModal({ documentId, documentTitle, onClose }: ShareModalProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    api.get('/rooms').then(({ data }) => {
      setRooms(data);
      setLoading(false);
    });
  }, []);

  const handleShare = async (roomId: string) => {
    setSharing(true);
    try {
      await api.post(`/documents/${documentId}/chat-share`, { room_id: roomId });
      alert('문서가 채팅방에 공유되었습니다.');
      onClose();
    } catch (err) {
      console.error('Chat share error:', err);
      alert('공유 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '8px', padding: '1.5rem', width: '400px', maxHeight: '500px',
        overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>채팅에 문서 공유</h3>
        <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
          &quot;{documentTitle}&quot; 문서를 공유할 채팅방을 선택하세요.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>로딩 중...</div>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>채팅방이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleShare(room.id)}
                disabled={sharing}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.8rem', border: '1px solid #eee', borderRadius: '6px',
                  background: '#fff', cursor: sharing ? 'not-allowed' : 'pointer', textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{room.other_user?.name || '알 수 없음'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#999' }}>
                    {room.topic === 'operations' ? '업무' : '피드백'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.4rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
