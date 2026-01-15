import { useCallback, useRef, useEffect } from 'react';

const NOTIFICATION_SOUND_URL = 'https://cdn.freesound.org/previews/536/536420_11943129-lq.mp3';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    // Preload the audio
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
    
    return () => {
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    // Throttle sound to once per 2 seconds
    const now = Date.now();
    if (now - lastPlayedRef.current < 2000) {
      return;
    }
    lastPlayedRef.current = now;

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Autoplay might be blocked, ignore error
        });
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
}
