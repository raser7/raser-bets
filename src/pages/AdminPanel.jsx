import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Upload, Link2, Send, Loader2, CheckCircle2, RefreshCcw, Copy, ExternalLink, Activity } from 'lucide-react';
import Logo from '../components/Logo';

export default function AdminPanel() {
  const [file, setFile] = useState(null);
  const [analisis, setAnalisis] = useState('');
  const [recomendacion, setRecomendacion] = useState('');
  const [linkApuesta, setLinkApuesta] = useState('');
  const [passwordLocal, setPasswordLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [masterPass, setMasterPass] = useState('');
  
  const [currentPost, setCurrentPost] = useState(null);

  const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

  useEffect(() => {
    // Leemos el documento único en vivo para mostrar en la columna derecha
    const unsub = onSnapshot(doc(db, "contenido_app", "pronostico_actual"), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentPost(docSnap.data());
      } else {
        setCurrentPost(null);
      }
    });
    return () => unsub();
  }, []);

  const generarPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomArray = new Uint32Array(8);
    window.crypto.getRandomValues(randomArray);
    let token = '';
    for (let i = 0; i < randomArray.length; i++) {
      token += chars[randomArray[i] % chars.length];
    }
    setPasswordLocal(token);
  };

  const handleCopy = () => {
    if(passwordLocal) {
        navigator.clipboard.writeText(passwordLocal);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setFile(null);
    setAnalisis('');
    setRecomendacion('');
    setLinkApuesta('');
    setPasswordLocal('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file && !analisis && !linkApuesta) {
      alert("Debes añadir algo para publicar.");
      return;
    }
    
    setLoading(true);
    setStatus('Procesando...');

    try {
      let imagenUrl = "";
      
      if (file) {
        setStatus('Subiendo imagen a ImgBB...');
        const formData = new FormData();
        formData.append("image", file);
        
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body: formData,
        });
        
        const imgbbData = await res.json();
        if (imgbbData.success) {
          imagenUrl = imgbbData.data.url;
        } else {
          throw new Error("Error al subir imagen a ImgBB");
        }
      }

      setStatus('Guardando BD...');
      const payload = {
        analisis: analisis,
        link_apuesta: linkApuesta,
        fecha_actualizacion: new Date(),
      };
      
      if (recomendacion) payload.recomendacion = recomendacion;
      if (imagenUrl) payload.imagen_url = imagenUrl;

      // Single document overwrite. No history logic!
      await setDoc(doc(db, "contenido_app", "pronostico_actual"), payload);
      
      if (passwordLocal) {
        await setDoc(doc(db, "configuracion", "seguridad"), { password: passwordLocal });
      }
      
      setStatus('¡Éxito!');
      setTimeout(() => {
        setStatus('');
        resetForm();
      }, 2000);
      
    } catch (error) {
      console.error(error);
      alert("Hubo un error: " + error.message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-brand/30">
         <div className="w-full max-w-sm bg-[#050505] border border-zinc-900 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-zinc-600 font-bold tracking-[0.2em] mb-8 text-[10px]">VERIFICACIÓN DE IDENTIDAD</h2>
            <input 
              type="password" 
              value={masterPass} 
              onChange={e => setMasterPass(e.target.value.toUpperCase())} 
              onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   if(masterPass === import.meta.env.VITE_MASTER_PASS) setIsAdminAuthed(true);
                   else alert('Acceso Denegado.');
                 }
              }}
              className="w-full bg-black border border-zinc-800 focus:border-brand/50 rounded-2xl px-5 py-4 text-center text-white tracking-[0.2em] font-mono text-sm mb-6 transition-all" 
              placeholder="MASTER KEY" 
            />
            <button 
              onClick={() => {
                if(masterPass === import.meta.env.VITE_MASTER_PASS) {
                  setIsAdminAuthed(true);
                } else {
                  alert('Acceso Denegado.');
                }
              }} 
              className="w-full bg-white hover:bg-brand text-black font-extrabold py-4 rounded-xl transition-colors text-[11px] tracking-[0.2em] active:scale-95"
            >
              INGRESAR AL PANEL
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 flex flex-col md:flex-row font-sans selection:bg-brand/30">
      
      {/* SIDEBAR IZQUIERDA: Formulario de Control */}
      <div className="w-full md:w-[480px] bg-[#0a0a0c] border-r border-white/5 p-8 flex flex-col h-screen md:sticky top-0 overflow-y-auto custom-scrollbar">
        
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight">
            <Logo className="w-8 h-8 text-brand drop-shadow-[0_0_15px_#00ff66]" />
            Panel Admin
          </h1>
          <p className="text-gray-500 text-[10px] mt-2 font-bold tracking-[0.2em] uppercase">Sobreescribe Tu Jugada.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          
          <div className="space-y-2">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em] flex items-center justify-between">
              FOTO DE JUGADA
            </label>
            <div className={`relative border border-dashed rounded-2xl p-6 text-center transition-all bg-black/40 cursor-pointer ${file ? 'border-brand/40 shadow-[0_0_20px_rgba(0,255,102,0.05)_inset]' : 'border-white/10 hover:border-white/30'}`}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="text-brand font-medium text-sm">✅ {file.name}</div>
              ) : (
                <div className="text-zinc-600 flex flex-col items-center gap-2 text-[10px] font-bold tracking-[0.2em]">
                   <Upload className="w-6 h-6 text-zinc-600" />
                   TOCAR PARA SUBIR
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em]">ANÁLISIS SECRETO</label>
            <textarea
              className="w-full bg-[#050505] border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-brand/50 min-h-[140px] text-[15px] leading-relaxed resize-none custom-scrollbar"
              placeholder="Argumenta tu apuesta..."
              value={analisis}
              onChange={(e) => setAnalisis(e.target.value)}
            ></textarea>
          </div>

          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="text-red-500 font-bold text-[10px] tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>
              LÍMITE MÁXIMO A APOSTAR
            </label>
            <input
              type="text"
              className="w-full bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-4 text-red-500 placeholder-red-900/50 focus:outline-none focus:border-red-500/50 text-sm font-bold tracking-wide transition-colors"
              placeholder="Ej: Solo el 5% de tu capital..."
              value={recomendacion}
              onChange={(e) => setRecomendacion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em]">LINK DE APUESTA</label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                className="w-full bg-[#050505] border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-white focus:outline-none focus:border-brand/50 text-sm"
                placeholder="https://..."
                value={linkApuesta}
                onChange={(e) => setLinkApuesta(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5 mt-auto">
            <label className="text-brand font-bold text-[10px] tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse shadow-[0_0_8px_#00ff66]"></span>
              TOKEN DE ACCESO
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full bg-[#050505] border border-brand/20 rounded-2xl px-4 py-4 text-brand placeholder-zinc-800 focus:outline-none focus:border-brand/50 font-mono font-black tracking-[0.2em] text-center uppercase"
                placeholder="CREAR TOKEN"
                value={passwordLocal}
                onChange={(e) => setPasswordLocal(e.target.value.toUpperCase())}
              />
              <button 
                type="button" 
                onClick={generarPassword}
                className="px-5 bg-brand/5 hover:bg-brand text-brand hover:text-black rounded-2xl transition-all border border-brand/20 flex items-center justify-center group"
              >
                <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
            
            {passwordLocal && (
              <div className="flex items-center justify-between text-brand mt-4 px-2">
                 <span className="text-[10px] tracking-widest uppercase font-bold opacity-70">Copiar a portapapeles:</span>
                 <button type="button" onClick={handleCopy} className="hover:text-white p-2 bg-brand/10 rounded-lg">
                   {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                 </button>
              </div>
            )}
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-brand text-black font-extrabold text-[13px] tracking-[0.15em] py-5 rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4 active:scale-[0.98] shadow-lg shadow-brand/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 w-1/3 h-full bg-white/40 skew-x-12 -translate-x-[200%] group-hover:animate-[shine_1.5s_ease-out]"></div>
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {status}</>
              ) : status ? (
                <><CheckCircle2 className="w-6 h-6" /> {status}</>
              ) : (
                <><Send className="w-4 h-4" /> PUBLICAR Y SOBRESCRIBIR</>
              )}
            </span>
          </button>
        </form>
      </div>

      {/* DERECHA: Vista Previa en Vivo */}
      <div className="flex-1 p-6 md:p-10 h-screen overflow-y-auto custom-scrollbar flex flex-col items-center justify-center relative">
         
         <div className="absolute top-10 w-full flex items-center justify-between px-10 max-w-2xl">
           <h2 className="text-xs font-bold text-zinc-500 tracking-[0.2em] flex items-center gap-2">
             <Activity className="w-4 h-4" />
             VISTA PREVIA EN VIVO
           </h2>
           <span className="text-[9px] font-black text-brand bg-brand/10 px-3 py-1.5 rounded-full border border-brand/20 uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,102,0.1)]">
             CLIENTE ACTIVO
           </span>
         </div>
         
         {!currentPost ? (
           <div className="w-full max-w-2xl mt-20 py-32 flex flex-col items-center justify-center text-zinc-700 border border-zinc-900 border-dashed rounded-3xl bg-zinc-950/30">
             <RefreshCcw className="w-10 h-10 mb-4 opacity-20" />
             <p className="font-bold tracking-[0.2em] text-[10px]">NO HAY PUBLICACIÓN ACTIVA</p>
           </div>
         ) : (
           <div className="w-full max-w-4xl mt-12 bg-[#0a0a0c] border border-zinc-800/80 rounded-[2rem] p-6 shadow-1xl relative overflow-y-auto custom-scrollbar max-h-[85vh]">
              
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                
                {/* Columna Izquierda (Imagen, Recom, Link) */}
                <div className="w-full lg:w-5/12 space-y-6">
                  {currentPost.imagen_url && (
                    <div className="w-full rounded-2xl overflow-hidden relative border border-white/5 bg-black">
                       <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                         <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse shadow-[0_0_8px_#00ff66]"></div>
                         APUESTA
                       </div>
                       <img src={currentPost.imagen_url} className="w-full h-auto object-cover opacity-90" alt="Preview"/>
                    </div>
                  )}

                  {currentPost.recomendacion && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 shadow-inner">
                      <h3 className="text-red-500 text-[9px] font-black tracking-[0.2em] mb-1 flex items-center gap-2">
                         LÍMITE RECOMENDADO MÁXIMO
                      </h3>
                      <p className="text-red-400 font-bold text-xs tracking-wide">{currentPost.recomendacion}</p>
                    </div>
                  )}

                  {currentPost.link_apuesta && (
                    <div className="w-full group flex flex-col bg-brand text-black rounded-2xl relative overflow-hidden">
                      <div className="flex items-center justify-between py-4 px-5 relative z-10">
                        <span className="flex-1 text-center font-black text-[11px] md:text-[12px] tracking-[0.1em]">TOCA AQUÍ PARA HACER LA JUGADA</span>
                        <div className="bg-black/10 p-1.5 rounded-lg border border-black/5">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="bg-black/10 py-2 px-3 text-center border-t border-black/10 relative z-10">
                        <span className="text-[8px] font-bold tracking-widest opacity-80 break-all">{currentPost.link_apuesta}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Derecha (Análisis) */}
                {currentPost.analisis && (
                  <div className="w-full lg:w-7/12 bg-[#050505] border border-white/5 rounded-2xl p-6 h-fit">
                     <h3 className="text-[9px] font-bold text-brand mb-3 tracking-[0.2em] flex items-center gap-2">
                        INFORME VIP
                        <div className="flex-1 h-px bg-gradient-to-r from-brand/20 to-transparent ml-2"></div>
                     </h3>
                     <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                       {currentPost.analisis}
                     </p>
                  </div>
                )}
                
              </div>
           </div>
         )}
      </div>
      
    </div>
  );
}
