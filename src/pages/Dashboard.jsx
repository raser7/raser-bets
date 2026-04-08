import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Loader2, ExternalLink, RefreshCcw, Lock } from 'lucide-react';
import Logo from '../components/Logo';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const localPassword = localStorage.getItem('raserbets_auth_password');
    if (!localPassword) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const configRef = doc(db, "configuracion", "seguridad");
        const configSnap = await getDoc(configRef);

        if (!configSnap.exists() || configSnap.data().password !== localPassword) {
          localStorage.removeItem('raserbets_auth_password');
          navigate('/');
          return;
        }

        const docRef = doc(db, "contenido_app", "pronostico_actual");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          console.log("No hay pronóstico activo.");
        }
      } catch (error) {
        console.error("Error obteniendo datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('raserbets_auth_password');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4 transition-colors duration-500">
        <Logo className="w-16 h-16 text-brand mb-6 opacity-80" />
        <p className="text-zinc-500 dark:text-zinc-600 font-bold tracking-widest text-xs">SINCRONIZANDO</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-zinc-200 font-sans selection:bg-brand/30 transition-colors duration-500">

      <header className="border-b border-slate-200 dark:border-zinc-900 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-7 h-7 text-brand drop-shadow-[0_0_10px_rgba(0,255,102,0.3)]" />
            <span className="font-extrabold tracking-widest text-slate-900 dark:text-white text-xs mt-0.5">RASERBETS</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors text-[10px] font-bold tracking-[0.15em] flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-full"
          >
            SALIR <Lock className="w-3 h-3" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24 flex flex-col items-center">
        {!data ? (
          <div className="py-32 flex flex-col items-center text-slate-400 dark:text-zinc-700 space-y-4">
            <RefreshCcw className="w-8 h-8 opacity-40 dark:opacity-20" />
            <p className="text-xs font-bold tracking-[0.2em] text-center leading-relaxed">
              EL TABLERO ESTÁ LIMPIO.<br /> NO HAY JUGADA ACTIVA.
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-8 mt-2">

            {/* Columna Izquierda: Imagen, Recomendacion y Link */}
            <div className="w-full lg:w-5/12 space-y-6">
              {data.imagen_url && (
                <div className="w-full bg-white dark:bg-[#050505] border border-slate-200 dark:border-zinc-900 rounded-3xl overflow-hidden shadow-xl dark:shadow-2xl relative group transition-colors">
                  <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-black/60 backdrop-blur-md text-slate-900 dark:text-white text-[9px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 flex items-center gap-2 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                    APUESTA VIGENTE
                  </div>
                  <img
                    src={data.imagen_url}
                    alt="Jugada"
                    className="w-full h-auto object-cover max-h-[500px] opacity-95 dark:opacity-90 transition-opacity"
                  />
                </div>
              )}

              {(data.recomendacion || data.link_apuesta) && (
                <div className="flex flex-col gap-4">
                  {data.recomendacion && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(239,68,68,0.05)] transition-colors">
                      <h3 className="text-red-500 text-[10px] font-black tracking-[0.2em] mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        LÍMITE MÁXIMO A APOSTAR
                      </h3>
                      <p className="text-red-500 dark:text-red-400 font-bold text-sm tracking-wide">{data.recomendacion}</p>
                    </div>
                  )}

                  {data.link_apuesta && (
                    <a 
                      href={data.link_apuesta} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full flex flex-col bg-brand hover:bg-slate-900 dark:hover:bg-white text-black hover:text-white dark:hover:text-black rounded-2xl transition-all shadow-md hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] relative"
                    >
                      <div className="flex items-center justify-between py-5 px-6 relative z-10">
                        <span className="flex-1 text-center pl-8 font-black text-[12px] md:text-[13px] tracking-[0.15em]">TOCA AQUÍ PARA HACER LA JUGADA</span>
                        <div className="bg-black/10 dark:bg-black/10 p-2 rounded-xl group-hover:bg-white/10 dark:group-hover:bg-black/5 transition-colors">
                          <ExternalLink className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="bg-white/20 dark:bg-black/10 py-2.5 px-4 text-center border-t border-black/10 relative z-10">
                        <span className="text-[9px] font-bold tracking-widest opacity-90 dark:opacity-80 break-all">{data.link_apuesta}</span>
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Columna Derecha: Análisis Largo */}
            {data.analisis && (
              <div className="w-full lg:w-7/12 bg-white dark:bg-[#050505] border border-slate-200 dark:border-zinc-900/80 rounded-2xl p-6 md:p-8 flex flex-col h-fit sticky top-24 shadow-xl dark:shadow-none transition-colors">
                <h3 className="text-[10px] font-bold text-brand mb-4 tracking-[0.2em] flex items-center gap-2">
                  INFORME VIP
                  <div className="flex-1 h-px bg-gradient-to-r from-brand/20 dark:from-brand/20 to-transparent ml-2"></div>
                </h3>
                <p className="text-slate-700 dark:text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                  {data.analisis}
                </p>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
