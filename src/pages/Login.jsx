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
      
      <div className="absolute top-4 right-4 lg:top-6 lg:right-8 z-50 w-[92vw] lg:w-[420px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-8 duration-700">
        
        <div className="flex flex-col gap-4">
           {/* Line 1: WhatsApp */}
           <div className="flex items-center gap-4 group">
              <div className="flex-shrink-0">
                 <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(37,211,102,0.3)]">
                   <svg className="w-6 h-6 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                 </div>
              </div>
              <p className="text-zinc-300 text-[11px] md:text-xs leading-relaxed font-bold flex-1">
                 Si quieres acceder al siguiente Pronositco, escribe un mensaje al ultimos numero que hablo en el grupo de wsp
              </p>
           </div>

           {/* Divider */}
           <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"></div>

           {/* Line 2: Telegram */}
           <a href="https://t.me/RASERBETS_OFICIAL" target="_blank" rel="noreferrer" className="flex items-center gap-4 group cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all">
              <div className="flex-shrink-0">
                 <div className="w-10 h-10 bg-[#0088cc]/10 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(0,136,204,0.3)]">
                   <svg className="w-6 h-6 text-[#0088cc] group-hover:scale-125 transition-transform animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" viewBox="0 0 24 24" fill="currentColor" style={{animationDuration: '2s'}}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.15-.27.275-.55.275l.213-3.051 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/></svg>
                 </div>
              </div>
              <p className="text-[#0088cc] group-hover:text-blue-400 text-[11px] md:text-xs leading-relaxed font-black underline decoration-[#0088cc]/40 underline-offset-4 decoration-2 flex-1">
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
