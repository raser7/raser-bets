import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [proximaHora, setProximaHora] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "contenido_app", "pronostico_actual"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().proxima_hora) {
        setProximaHora(docSnap.data().proxima_hora);
      } else {
        setProximaHora(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const configRef = doc(db, "configuracion", "seguridad");
      const configSnap = await getDoc(configRef);

      if (configSnap.exists() && configSnap.data().password === password) {
        localStorage.setItem('raserbets_auth_password', password);
        navigate('/dashboard');
      } else {
        setError('Token inválido. Verifica tus accesos VIP.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4 selection:bg-brand/30 relative transition-colors duration-500">
      <style>{`
        @keyframes pop-alive {
          0%, 100% { transform: scale(1) rotate(0); }
          10% { transform: scale(1.3) rotate(-15deg); }
          20% { transform: scale(1.05) rotate(10deg); }
          30% { transform: scale(1.2) rotate(-5deg); }
          40% { transform: scale(1) rotate(0); }
        }
        .animate-pop-alive {
          animation: pop-alive 3.5s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
        }
        .animate-pop-alive-delayed {
          animation: pop-alive 3.5s cubic-bezier(0.28, 0.84, 0.42, 1) infinite 1.75s;
        }
        @keyframes float-annoy {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-1deg); }
          50% { transform: translateY(4px) rotate(1deg); }
          75% { transform: translateY(-2px) rotate(0deg); }
        }
        .animate-estorbo {
          animation: float-annoy 3s ease-in-out infinite;
        }
      `}</style>
      
      {/* Banner Publicitario (estilo Casa de Apuestas) */}
      <div className="absolute top-2 sm:top-8 z-50 w-[95vw] sm:w-[500px] flex flex-col gap-3 sm:gap-6 animate-in fade-in slide-in-from-top-4 duration-1000 select-none animate-estorbo bg-red-50/50 dark:bg-red-950/20 sm:bg-transparent sm:dark:bg-transparent p-3 sm:p-0 rounded-2xl border border-red-200 dark:border-red-500/20 sm:border-transparent sm:dark:border-transparent transition-colors">
        
        <div className="relative z-10 w-full text-center px-1 mb-0 sm:mb-1">
           <h3 className="text-red-600 dark:text-[#ff4444] text-[12px] sm:text-[17px] font-black tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,1)] animate-pulse transition-colors">
              🔓 ACCESO AL SIGUIENTE PRONÓSTICO 🔓
           </h3>
        </div>

        {/* WhatsApp Phantom */}
        <div className="flex items-center gap-3 sm:gap-4 cursor-default group px-1">
          <div className="flex-shrink-0 animate-pop-alive">
            <svg className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-[0_0_10px_rgba(37,211,102,0.5)] dark:drop-shadow-[0_0_10px_rgba(37,211,102,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(37,211,102,1)] transition-all duration-300" fill="none" viewBox="0 0 360 362">
              <path fill="#25D366" fillRule="evenodd" d="M307.546 52.566C273.709 18.684 228.706.017 180.756 0 81.951 0 1.538 80.404 1.504 179.235c-.017 31.594 8.242 62.432 23.928 89.609L0 361.736l95.024-24.925c26.179 14.285 55.659 21.805 85.655 21.814h.077c98.788 0 179.21-80.413 179.244-179.244.017-47.898-18.608-92.926-52.454-126.807v-.008Zm-126.79 275.788h-.06c-26.73-.008-52.952-7.194-75.831-20.765l-5.44-3.231-56.391 14.791 15.05-54.981-3.542-5.638c-14.912-23.721-22.793-51.139-22.776-79.286.035-82.14 66.867-148.973 149.051-148.973 39.793.017 77.198 15.53 105.328 43.695 28.131 28.157 43.61 65.596 43.593 105.398-.035 82.149-66.867 148.982-148.982 148.982v.008Zm81.719-111.577c-4.478-2.243-26.497-13.073-30.606-14.568-4.108-1.496-7.09-2.243-10.073 2.243-2.982 4.487-11.568 14.577-14.181 17.559-2.613 2.991-5.226 3.361-9.704 1.117-4.477-2.243-18.908-6.97-36.02-22.226-13.313-11.878-22.304-26.54-24.916-31.027-2.613-4.486-.275-6.91 1.959-9.136 2.011-2.011 4.478-5.234 6.721-7.847 2.244-2.613 2.983-4.486 4.478-7.469 1.496-2.991.748-5.603-.369-7.847-1.118-2.243-10.073-24.289-13.812-33.253-3.636-8.732-7.331-7.546-10.073-7.692-2.613-.13-5.595-.155-8.586-.155-2.991 0-7.839 1.118-11.947 5.604-4.108 4.486-15.677 15.324-15.677 37.361s16.047 43.344 18.29 46.335c2.243 2.991 31.585 48.225 76.51 67.632 10.684 4.615 19.029 7.374 25.535 9.437 10.727 3.412 20.49 2.931 28.208 1.779 8.604-1.289 26.498-10.838 30.228-21.298 3.73-10.46 3.73-19.433 2.613-21.298-1.117-1.865-4.108-2.991-8.586-5.234l.008-.017Z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-slate-800 dark:text-zinc-200 text-[11px] sm:text-[13px] leading-snug sm:leading-relaxed font-bold transition-colors flex-1 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-left">
            Para desbloquear el siguiente pronóstico, envía un mensaje al último número publicado en el grupo de WhatsApp
          </p>
        </div>

        {/* Telegram Phantom */}
        <a href="https://t.me/rasermoney" target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 sm:gap-4 group outline-none relative z-10 w-full cursor-pointer px-1">
           
          <p className="text-[#2AABEE] dark:text-[#5bc1f6] group-hover:text-[#229ED9] dark:group-hover:text-[#88d1f7] transition-colors text-[11px] sm:text-[13px] leading-snug sm:leading-relaxed font-bold tracking-wide flex-1 text-right drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
            También puedes contactarnos directamente por Telegram haciendo <span className="underline decoration-[#2AABEE]/60 dark:decoration-[#5bc1f6]/60 underline-offset-4">CLICK AQUI</span>
          </p>

          <div className="flex-shrink-0 animate-pop-alive-delayed">
            <svg className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-[0_0_10px_rgba(42,171,238,0.4)] dark:drop-shadow-[0_0_10px_rgba(42,171,238,0.8)] group-hover:drop-shadow-[0_0_20px_rgba(42,171,238,1)] transition-all duration-300" viewBox="0 0 256 256" preserveAspectRatio="xMidYMid">
              <defs>
                <linearGradient id="telegram__a" x1="50%" x2="50%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#2AABEE" />
                  <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
              </defs>
              <path fill="url(#telegram__a)" d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.038 128.038 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51 0-33.934-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0Z" />
              <path fill="#FFF" d="M57.94 126.648c37.32-16.256 62.2-26.974 74.64-32.152 35.56-14.786 42.94-17.354 47.76-17.441 1.06-.017 3.42.245 4.96 1.49 1.28 1.05 1.64 2.47 1.82 3.467.16.996.38 3.266.2 5.038-1.92 20.24-10.26 69.356-14.5 92.026-1.78 9.592-5.32 12.808-8.74 13.122-7.44.684-13.08-4.912-20.28-9.63-11.26-7.386-17.62-11.982-28.56-19.188-12.64-8.328-4.44-12.906 2.76-20.386 1.88-1.958 34.64-31.748 35.26-34.45.08-.338.16-1.598-.6-2.262-.74-.666-1.84-.438-2.64-.258-1.14.256-19.12 12.152-54 35.686-5.1 3.508-9.72 5.218-13.88 5.128-4.56-.098-13.36-2.584-19.9-4.708-8-2.606-14.38-3.984-13.82-8.41.28-2.304 3.46-4.662 9.52-7.072Z" />
            </svg>
          </div>
        </a>
      </div>

      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-700 ease-out mt-40 lg:mt-0 relative z-10">
        <div className="flex flex-col items-center mb-12">
          <Logo className="w-20 h-20 text-brand mb-6 drop-shadow-[0_0_35px_rgba(0,255,102,0.25)]" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-slate-900 dark:text-white transition-colors">ACCESO VIP</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="TOKEN DE SEGURIDAD"
                className="w-full bg-white dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/80 rounded-xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-700 focus:outline-none focus:border-brand/50 dark:focus:border-brand/40 focus:bg-slate-50 dark:focus:bg-zinc-900 transition-all font-mono tracking-[0.2em] text-center text-sm uppercase shadow-sm dark:shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center py-3 px-4 rounded-xl font-medium tracking-wide transition-colors">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-brand hover:bg-slate-900 dark:hover:bg-white text-black hover:text-white dark:hover:text-black font-black uppercase tracking-[0.2em] py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center relative shadow-lg shadow-brand/20 dark:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2 relative z-10">
                <Loader2 className="w-5 h-5 animate-spin" />
                VERIFICANDO
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 relative z-10">
                INGRESAR
                <ArrowRight className="w-5 h-5 transition-transform" />
              </span>
            )}
          </button>
        </form>

        {proximaHora && (
          <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 bg-slate-200/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-slate-300 dark:border-zinc-800 backdrop-blur-sm transition-colors">
            <h4 className="text-slate-500 dark:text-zinc-500 text-[10px] font-bold tracking-[0.2em] mb-2 uppercase flex items-center justify-center gap-2">
              <span className="text-sm">⏰</span> PRÓXIMO PRONÓSTICO SE SUBIRÁ <span className="text-sm">⏰</span>
            </h4>
            <p className="text-slate-900 dark:text-white font-black text-lg tracking-wide">
              {proximaHora.split(' ').map((word, index, arr) => 
                index === arr.length - 1 ? <span key={index} className="text-brand ml-1">{word}</span> : word + ' '
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
