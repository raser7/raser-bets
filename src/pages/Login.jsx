import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const q = query(collection(db, "configuracion"), where("password", "==", password.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        localStorage.setItem('raserbets_auth_password', password.toUpperCase());
        localStorage.removeItem('raserbets_auth'); // Limpiar token antiguo por si acaso
        navigate('/dashboard');
      } else {
        setError('Token inválido o expirado.');
      }
    } catch (err) {
      console.log(err);
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-brand/30 relative">
      
      <div className="absolute top-4 right-4 lg:top-6 lg:right-8 z-50 w-[92vw] lg:w-[460px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-8 duration-700">
        
        <div className="flex flex-col gap-5">
           
           {/* Line 1: WhatsApp */}
           <div className="flex items-center gap-4">
              <div className="flex-shrink-0 animate-bounce">
                 <svg className="w-12 h-12 drop-shadow-[0_0_15px_rgba(37,211,102,0.4)]" viewBox="0 0 24 24" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg">
                   <path fill="#25D366" d="M11.99 24c6.627 0 12-5.373 12-12S18.617 0 11.99 0C5.362 0 0 5.372 0 11.999c0 2.106.551 4.135 1.597 5.945l-1.55 5.66c-.035.131.02.261.127.323.01.006.019.011.028.016.035.011.077.014.12.012l5.776-1.516c1.788 1.01 3.82 1.56 5.892 1.56"/>
                   <path fill="#FFF" d="m18.736 15.632-2.52-1.18c-.469-.22-.988-.044-1.28.32l-1.34 1.63c-2.31-1.11-3.92-2.73-5.02-5.05l1.63-1.34c.365-.292.544-.811.325-1.28L9.362 6.22C9.07 5.6 8.35 5.51 8 6l-.999 1.25c-1.31 1.76.13 5.37 3.33 8.57s6.81 4.64 8.57 3.32l1.24-.969c.478-.344.409-1.076-.217-1.353"/>
                 </svg>
              </div>
              <p className="text-zinc-300 text-[12px] md:text-[13px] leading-relaxed font-bold flex-1">
                 Si quieres acceder al siguiente Pronositco, escribe un mensaje al ultimos numero que hablo en el grupo de wsp
              </p>
           </div>

           {/* Divider */}
           <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"></div>

           {/* Line 2: Telegram */}
           <a href="https://t.me/TULINK_AQUI" target="_blank" rel="noreferrer" className="flex items-center gap-4 group cursor-pointer hover:bg-zinc-900 p-2 -mx-2 rounded-2xl transition-all">
              <div className="flex-shrink-0 animate-bounce" style={{ animationDelay: '150ms' }}>
                 <svg className="w-12 h-12 drop-shadow-[0_0_15px_rgba(42,171,238,0.4)] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <circle cx="12" cy="12" r="12" fill="#2AABEE"/>
                   <path d="M5.435 11.884c3.5-1.523 5.834-2.534 7.001-3.023 3.334-1.393 4.028-1.634 4.48-1.644.099 0 .324.023.473.14.12.096.151.226.166.326.014.101.02.29-.009.432-.14 1.455-.733 4.956-1.044 7.245-.133.982-.494 1.312-.843 1.343-.761.066-1.332-.43-2.072-.912-1.157-.751-1.81-1.21-2.932-1.947-1.288-.848-.452-1.32.28-2.057.192-.194 3.528-3.235 3.593-3.513.01-.035.011-.157-.061-.216-.071-.059-.18-.035-.258-.023-.11.023-1.921 1.229-5.42 3.585-.508.351-.977.522-1.4.512-.464-.01-1.352-.259-2.012-.477-.811-.26-1.451-.397-1.394-.853.03-.23.486-.697 1.396-1.168z" fill="#FFF"/>
                 </svg>
              </div>
              <p className="text-[#2AABEE] group-hover:text-[#5bc1f6] text-[12px] md:text-[13px] leading-relaxed font-black underline decoration-[#2AABEE]/40 underline-offset-4 decoration-2 flex-1">
                 o de caso contrarioenviame un mensaje al telegram usando este link
              </p>
           </a>
        </div>
      </div>

      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-700 ease-out mt-10 lg:mt-0">
        
        <div className="flex flex-col items-center mb-12">
          <Logo className="w-20 h-20 text-brand mb-6 drop-shadow-[0_0_35px_rgba(0,255,102,0.25)]" />
          <h1 className="text-2xl font-black tracking-[0.2em] text-white">ACCESO VIP</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative group">
              <input
                type="text"
                placeholder="TOKEN DE SEGURIDAD"
                className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-5 py-4 text-white placeholder-zinc-700 focus:outline-none focus:border-brand/40 focus:bg-zinc-900 transition-all font-mono tracking-[0.2em] text-center text-sm uppercase shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCorrect="off"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>
            </div>
            {error && (
              <p className="text-red-400 text-xs text-center font-medium mt-3 animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-white hover:bg-brand text-black font-extrabold tracking-widest text-[13px] py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:bg-white active:scale-95 group overflow-hidden relative shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,255,102,0.3)] mt-2"
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/30 skew-x-12 -translate-x-full group-hover:animate-[shine_1s_ease-out]"></div>
            {loading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : (
              <>
                <span className="relative z-10">VALIDAR TOKEN</span>
                <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all relative z-10" />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-12 text-center text-zinc-700/50 text-[10px] tracking-widest font-mono">
          <p>SISTEMA RESTRINGIDO</p>
        </div>
      </div>
    </div>
  );
}
