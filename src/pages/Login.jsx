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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-brand/30">
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-700 ease-out">
        
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
