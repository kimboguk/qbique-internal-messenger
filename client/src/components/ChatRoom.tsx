import { useEffect, useRef, useState, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useChatStore } from '../stores/chatStore';
import api from '../hooks/useApi';
import MessageBubble from './MessageBubble';
import FileUploader from './FileUploader';

interface ChatRoomProps {
  roomId: string;
  socket: {
    sendMessage: (roomId: string, content: string, messageType?: string) => void;
    sendTyping: (roomId: string, isTyping: boolean) => void;
    sendReadReceipt: (roomId: string) => void;
    deleteMessage: (messageId: string) => void;
  };
}

const topicLabels: Record<string, string> = {
  operations: '법인 운영',
  feedback: '플랫폼 피드백',
};

const EMPTY_MESSAGES: never[] = [];

function DateSeparator({ date }: { date: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
      <span style={{ fontSize: '0.75rem', color: '#999', whiteSpace: 'nowrap' }}>{date}</span>
      <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
    </div>
  );
}

export default function ChatRoom({ roomId, socket }: ChatRoomProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useChatStore((s) => s.messages[roomId] ?? EMPTY_MESSAGES);
  const hasMore = useChatStore((s) => s.hasMore[roomId] ?? true);
  const typingUser = useChatStore((s) => s.typingUsers[roomId]);
  const rooms = useChatStore((s) => s.rooms);
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);

  const room = rooms.find((r) => r.id === roomId);
  const otherName = room?.other_user?.name || '';

  // 초기 메시지 로드
  useEffect(() => {
    setLoading(true);
    api.get(`/rooms/${roomId}/messages?limit=50`)
      .then(({ data }) => {
        setMessages(roomId, data.messages, data.has_more);
      })
      .finally(() => setLoading(false));
  }, [roomId]);

  // 새 메시지 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 무한 스크롤 (위로 스크롤 시 이전 메시지 로드)
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loading || !hasMore) return;

    if (container.scrollTop < 50) {
      const firstMsg = messages[0];
      if (!firstMsg) return;

      const prevScrollHeight = container.scrollHeight;
      setLoading(true);

      api.get(`/rooms/${roomId}/messages?limit=50&before=${firstMsg.created_at}`)
        .then(({ data }) => {
          prependMessages(roomId, data.messages, data.has_more);
          // 스크롤 위치 유지
          requestAnimationFrame(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - prevScrollHeight;
            }
          });
        })
        .finally(() => setLoading(false));
    }
  }, [roomId, messages, loading, hasMore]);

  // 메시지 전송
  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content) return;

    socket.sendMessage(roomId, content);
    setInput('');

    // 타이핑 중지
    socket.sendTyping(roomId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Enter로 전송, Shift+Enter로 줄바꿈
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 타이핑 인디케이터
  const handleInputChange = (value: string) => {
    setInput(value);

    socket.sendTyping(roomId, value.length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.sendTyping(roomId, false);
    }, 2000);
  };

  // 날짜 구분선 판별
  const getDateStr = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* 채팅방 헤더 */}
      <div style={{
        padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff',
      }}>
        <div>
          <span style={{ fontWeight: 'bold' }}>{otherName}</span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            {topicLabels[room?.topic || ''] || ''}
          </span>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: '#fafafa', minHeight: 0 }}
      >
        {loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>메시지 로딩 중...</div>
        )}

        {hasMore && messages.length > 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem', padding: '0.5rem' }}>
            {loading ? '로딩 중...' : '위로 스크롤하여 이전 메시지 보기'}
          </div>
        )}

        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const currentDate = getDateStr(msg.created_at);
          const prevDate = prevMsg ? getDateStr(prevMsg.created_at) : null;
          const showDateSep = currentDate !== prevDate;

          return (
            <div key={msg.id}>
              {showDateSep && <DateSeparator date={currentDate} />}
              <MessageBubble message={msg} onDelete={(messageId) => socket.deleteMessage(messageId)} />
            </div>
          );
        })}

        {/* 타이핑 인디케이터 */}
        {typingUser && (
          <div style={{ fontSize: '0.8rem', color: '#999', padding: '0.25rem 0.5rem', fontStyle: 'italic' }}>
            {typingUser.userName}님이 입력 중...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSend} style={{
        padding: '0.75rem', borderTop: '1px solid #e0e0e0', background: '#fff',
        display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
      }}>
        <FileUploader roomId={roomId} />
        <textarea
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          style={{
            flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '8px',
            resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none',
            maxHeight: '120px', lineHeight: '1.4',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          style={{
            padding: '0.5rem 1rem', background: input.trim() ? '#1976d2' : '#ccc',
            color: '#fff', border: 'none', borderRadius: '8px', cursor: input.trim() ? 'pointer' : 'default',
            fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap',
          }}
        >
          전송
        </button>
      </form>
    </div>
  );
}
