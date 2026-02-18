import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useSocket } from '../hooks/useSocket';
import { useNotification } from '../hooks/useNotification';
import api from '../hooks/useApi';
import RoomList from './RoomList';
import ChatRoom from './ChatRoom';

export default function ChatLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { rooms, currentRoomId, setRooms, setCurrentRoom } = useChatStore();
  const { requestPermission, notify } = useNotification();

  const socket = useSocket({
    onNewMessage: (message) => {
      const senderName = message.sender?.name || '알 수 없음';
      const content = message.message_type === 'file' ? '파일을 전송했습니다.' : message.content;
      notify(`${senderName}`, content);
    },
  });

  useEffect(() => {
    api.get('/rooms').then(({ data }) => setRooms(data));
    requestPermission();
  }, []);

  const markRoomRead = useChatStore((s) => s.markRoomRead);

  const handleSelectRoom = (roomId: string) => {
    if (currentRoomId) {
      socket.leaveRoom(currentRoomId);
    }
    setCurrentRoom(roomId);
    socket.joinRoom(roomId);
    socket.sendReadReceipt(roomId);
    markRoomRead(roomId);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 사이드바 */}
      <div style={{ width: '300px', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', background: '#f8f9fa' }}>
        {/* 헤더 */}
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>QIM</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {user?.name} ({user?.role === 'ceo' ? '대표이사' : '구성원'})
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {user?.role === 'ceo' && (
              <>
                <button
                  onClick={() => navigate('/ai')}
                  style={{ padding: '0.3rem 0.7rem', border: '1px solid #1976d2', borderRadius: '4px', background: '#e3f2fd', cursor: 'pointer', fontSize: '0.8rem', color: '#1976d2' }}
                >
                  AI
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  style={{ padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  관리
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              style={{ padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 채팅방 목록 */}
        <RoomList
          rooms={rooms}
          currentRoomId={currentRoomId}
          onSelectRoom={handleSelectRoom}
        />
      </div>

      {/* 메인 영역 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {currentRoomId ? (
          <ChatRoom
            roomId={currentRoomId}
            socket={socket}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#128172;</div>
              <div>채팅방을 선택해주세요</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
