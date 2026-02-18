import { useEffect, useRef } from 'react';

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1iZ2xvcHBtaWVfWVRQTk1OUFRZXmRqb3R4e3x8e3l2cm5pZGBeXFtcXmFlamxubmxpZGBeW1lYWFpcX2NnbG9ydnl7fHx7eXZybmlkYF5cW1xeYWRoa21ub21qaGRgXVtZWFhaXF9jZ2xvcnd5e3x8e3l2cm1pZGBdW1tbXF9iZWlsb3BvbWpoZGBeW1lYWFpbXmFlaWxvcnd5e3x8e3l1cm1pZGBeXFtbXF5hZWlsbnBvbWtoZGBeW1lYWFpbXmJlaWxvcnZ5e3x7enh1cm1pZA==';

export function useNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    // 오디오 초기화
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    // 알림 권한 확인
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return;
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  };

  const notify = (title: string, body: string) => {
    // 소리 재생
    audioRef.current?.play().catch(() => {});

    // 페이지가 포커스되어 있으면 알림 안 보냄
    if (document.hasFocus()) return;

    // 브라우저 알림
    if (permissionRef.current === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/vite.svg',
        tag: 'qim-message',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 5초 후 자동 닫기
      setTimeout(() => notification.close(), 5000);
    }
  };

  return { requestPermission, notify };
}
