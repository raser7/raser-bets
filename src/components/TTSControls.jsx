import { Loader2, Pause, Play, Square, Volume2 } from 'lucide-react';

export default function TTSControls({
  canPlay,
  isLoading,
  isPlaying,
  isPaused,
  error,
  message,
  onPlay,
  onPause,
  onStop,
  compact = false,
}) {
  if (!canPlay) return null;

  const buttonClass = compact
    ? 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-black hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-[10px] font-black tracking-[0.15em]'
    : 'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-black hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors text-[10px] font-black tracking-[0.15em]';

  const secondaryClass =
    'inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10 transition-colors text-[10px] font-black tracking-[0.15em]';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPlay}
          disabled={isLoading}
          className={`${buttonClass} disabled:opacity-60 disabled:cursor-wait`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPaused ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          {isLoading ? 'GENERANDO AUDIO' : isPaused ? 'REANUDAR AUDIO' : isPlaying ? 'REINICIAR AUDIO' : 'ESCUCHAR INFORME'}
        </button>

        {(isPlaying || isPaused) && (
          <>
            {isPlaying && (
              <button
                type="button"
                onClick={onPause}
                className={secondaryClass}
              >
                <Pause className="w-3.5 h-3.5" />
                PAUSAR
              </button>
            )}

            <button
              type="button"
              onClick={onStop}
              className={secondaryClass}
            >
              <Square className="w-3.5 h-3.5" />
              DETENER
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-medium text-red-500 dark:text-red-400">
          {error}
        </p>
      )}

      {!error && message && (
        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          {message}
        </p>
      )}
    </div>
  );
}
