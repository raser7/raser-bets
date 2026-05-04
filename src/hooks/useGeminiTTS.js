import { useEffect, useRef, useState } from 'react';

export default function useGeminiTTS(options = {}) {
  const remoteAudioUrl = options.remoteAudioUrl || '';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const audioRef = useRef(null);
  const lastSourceRef = useRef('');

  const cleanupAudio = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.src = '';
    audioRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  useEffect(() => {
    const sourceKey = remoteAudioUrl?.trim() || '';

    if (sourceKey !== lastSourceRef.current) {
      cleanupAudio();
      lastSourceRef.current = '';
      setIsPlaying(false);
      setIsPaused(false);
      setError('');
      setMessage('');
    }
  }, [remoteAudioUrl]);

  const play = async () => {
    const sourceUrl = remoteAudioUrl?.trim() || '';
    if (!sourceUrl) return;

    setError('');
    setMessage('');

    if (audioRef.current && lastSourceRef.current === sourceUrl) {
      if (isPaused) {
        await audioRef.current.play();
        return;
      }

      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      return;
    }

    cleanupAudio();

    const audio = new Audio(sourceUrl);

    audio.onplay = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setMessage('Reproduciendo audio guardado.');
    };

    audio.onpause = () => {
      if (audio.ended) return;
      setIsPlaying(false);
      setIsPaused(audio.currentTime > 0);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setIsPaused(false);
      audio.currentTime = 0;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setError('No se pudo reproducir el audio guardado.');
    };

    audioRef.current = audio;
    lastSourceRef.current = sourceUrl;
    await audio.play();
  };

  const pause = () => {
    if (!audioRef.current || !isPlaying) return;
    audioRef.current.pause();
  };

  const stop = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setIsPaused(false);
  };

  return {
    isLoading: false,
    isPlaying,
    isPaused,
    error,
    message,
    canPlay: Boolean(remoteAudioUrl?.trim()),
    play,
    pause,
    stop,
  };
}
