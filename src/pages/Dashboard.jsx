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
        // Bloqueo de Seguridad Crítico: Comprobar que la clave local sigue siendo la actual en Firebase
        const configRef = doc(db, "configuracion", "seguridad");
        const configSnap = await getDoc(configRef);

        if (!configSnap.exists() || configSnap.data().password !== localPassword) {
          localStorage.removeItem('raserbets_auth_password');
          navigate('/');
          return;
        }

        // Si la clave es correcta, mostramos la jugada
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Logo className="w-16 h-16 text-brand animate-pulse mb-6 opacity-80" />
        <p className="text-zinc-600 font-bold tracking-widest text-xs">SINCRONIZANDO</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans selection:bg-brand/30">

      <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-7 h-7 text-brand drop-shadow-[0_0_10px_rgba(0,255,102,0.3)]" />
            <span className="font-extrabold tracking-widest text-white text-xs mt-0.5">RASERBETS</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-600 hover:text-white transition-colors text-[10px] font-bold tracking-[0.15em] flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
          >
            SALIR <Lock className="w-3 h-3" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-24 flex flex-col items-center">
        {!data ? (
          <div className="py-32 flex flex-col items-center text-zinc-700 space-y-4">
            <RefreshCcw className="w-8 h-8 opacity-20" />
            <p className="text-xs font-bold tracking-[0.2em] text-center leading-relaxed">
              EL TABLERO ESTÁ LIMPIO.<br /> NO HAY JUGADA ACTIVA.
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-700 ease-out mt-2">

            {/* Columna Izquierda: Imagen, Recomendacion y Link */}
            <div className="w-full lg:w-5/12 space-y-6">
              {data.imagen_url && (
                <div className="w-full bg-[#050505] border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl relative group">
                  <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                    <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse shadow-[0_0_8px_#00ff66]"></div>
                    APUESTA VIGENTE
                  </div>
                  <img
                    src={data.imagen_url}
                    alt="Jugada"
                    className="w-full h-auto object-cover max-h-[500px] opacity-90 transition-opacity"
                  />
                </div>
              )}

              {(data.recomendacion || data.link_apuesta) && (
                <div className="flex flex-col gap-4">
                  {data.recomendacion && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                      <h3 className="text-red-500 text-[10px] font-black tracking-[0.2em] mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        LÍMITE MÁXIMO A APOSTAR
                      </h3>
                      <p className="text-red-400 font-bold text-sm tracking-wide">{data.recomendacion}</p>
                    </div>
                  )}

                  {data.link_apuesta && (
                    <a
                      href={data.link_apuesta}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full group flex items-center justify-between bg-brand hover:bg-white text-black font-black text-[13px] tracking-[0.15em] py-5 px-6 rounded-2xl transition-all duration-300 active:scale-95 shadow-[0_0_30px_rgba(0,255,102,0.15)] hover:shadow-[0_0_50px_rgba(255,255,255,0.25)] relative overflow-hidden"
                    >
                      <div className="absolute inset-0 w-1/3 h-full bg-white/40 skew-x-12 -translate-x-[200%] group-hover:animate-[shine_1.5s_ease-out_infinite]"></div>
                      <span className="flex-1 text-center pl-8 relative z-10">EJECUTAR JUGADA AHORA</span>
                      <div className="bg-black/10 p-2 rounded-xl group-hover:bg-black/5 transition-colors relative z-10">
                        <ExternalLink className="w-5 h-5" />
                      </div>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Columna Derecha: Análisis Largo */}
            {data.analisis && (
              <div className="w-full lg:w-7/12 bg-[#050505] border border-zinc-900/80 rounded-2xl p-6 md:p-8 flex flex-col h-fit sticky top-24">
                <h3 className="text-[10px] font-bold text-brand mb-4 tracking-[0.2em] flex items-center gap-2">
                  INFORME VIP
                  <div className="flex-1 h-px bg-gradient-to-r from-brand/20 to-transparent ml-2"></div>
                </h3>
                <p className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
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
