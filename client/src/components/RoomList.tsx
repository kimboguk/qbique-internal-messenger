import type { ChatRoom } from '../types';
import { useChatStore } from '../stores/chatStore';

interface RoomListProps {
  rooms: ChatRoom[];
  currentRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}

const topicLabels: Record<string, string> = {
  operations: '법인 운영',
  feedback: '플랫폼 피드백',
};

export default function RoomList({ rooms, currentRoomId, onSelectRoom }: RoomListProps) {
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  // 구성원별로 그룹핑
  const grouped = rooms.reduce<Record<string, ChatRoom[]>>((acc, room) => {
    const key = room.other_user?.name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {Object.entries(grouped).map(([name, memberRooms]) => {
        const otherUser = memberRooms[0]?.other_user;
        const isOnline = otherUser ? onlineUsers.includes(otherUser.id) : false;

        return (
          <div key={name} style={{ marginBottom: '0.25rem' }}>
            {/* 구성원 헤더 */}
            <div style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isOnline ? '#4caf50' : '#ccc',
                display: 'inline-block',
                flexShrink: 0,
              }} />
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{name}</span>
                {otherUser?.title && (
                  <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '1px' }}>{otherUser.title}</div>
                )}
              </div>
            </div>

            {/* 주제별 채팅방 */}
            {memberRooms.map((room) => {
              const isActive = room.id === currentRoomId;
              const unread = room.unread_count || 0;

              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  style={{
                    padding: '0.6rem 1rem 0.6rem 2rem',
                    cursor: 'pointer',
                    background: isActive ? '#e3f2fd' : 'transparent',
                    borderLeft: isActive ? '3px solid #1976d2' : '3px solid transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f0f0f0'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: '0.85rem', color: isActive ? '#1976d2' : '#333' }}>
                    {topicLabels[room.topic] || room.topic}
                  </span>
                  {unread > 0 && (
                    <span style={{
                      background: '#e53935', color: '#fff', borderRadius: '10px',
                      padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 'bold',
                    }}>
                      {unread}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {rooms.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '0.9rem' }}>
          채팅방이 없습니다
        </div>
      )}
    </div>
  );
}
