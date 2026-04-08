import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Upload, Link2, Send, Loader2, CheckCircle2, RefreshCcw, Copy, ExternalLink, Activity } from 'lucide-react';
import Logo from '../components/Logo';

export default function AdminPanel() {
  const [file, setFile] = useState(null);
  const [analisis, setAnalisis] = useState('');
  const [proximaHora, setProximaHora] = useState('');
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
    const unsub = onSnapshot(doc(db, "contenido_app", "pronostico_actual"), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentPost(docSnap.data());
      } else {
        setCurrentPost(null);
      }
    });
    return () => unsub();
  }, []);

  // Agregar soporte para Pegar Imagen (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const pastedFile = e.clipboardData.files[0];
        if (pastedFile.type.startsWith('image/')) {
          setFile(pastedFile);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
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
    setProximaHora('');
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
      if (proximaHora) payload.proxima_hora = proximaHora;
      if (imagenUrl) payload.imagen_url = imagenUrl;

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
      <div className="min-h-screen bg-slate-100 dark:bg-[#050505] flex items-center justify-center p-4 selection:bg-brand/30 transition-colors">
         <div className="w-full max-w-sm bg-white dark:bg-[#0a0a0c] border border-slate-200 dark:border-zinc-900 rounded-3xl p-10 text-center shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors">
            <h2 className="text-zinc-500 font-bold tracking-[0.2em] mb-8 text-[10px]">VERIFICACIÓN DE IDENTIDAD</h2>
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
              className="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-zinc-800 focus:border-brand/50 rounded-2xl px-5 py-4 text-center text-slate-800 dark:text-white tracking-[0.2em] font-mono text-sm mb-6 outline-none transition-all" 
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
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-brand dark:hover:bg-brand font-extrabold py-4 rounded-xl transition-colors text-[11px] tracking-[0.2em] active:scale-95"
            >
              INGRESAR AL PANEL
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-800 dark:text-gray-200 flex flex-col md:flex-row font-sans selection:bg-brand/30 transition-colors duration-500">
      
      {/* SIDEBAR IZQUIERDA: Formulario de Control */}
      <div className="w-full md:w-[480px] bg-white dark:bg-[#0a0a0c] border-r border-slate-200 dark:border-white/5 p-5 flex flex-col h-screen md:sticky top-0 overflow-y-auto custom-scrollbar transition-colors">
        
        <div className="mb-5">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight transition-colors">
            <Logo className="w-8 h-8 text-brand drop-shadow-[0_0_15px_rgba(0,255,102,0.5)]" />
            Panel Admin
          </h1>
          <p className="text-gray-500 text-[10px] mt-2 font-bold tracking-[0.2em] uppercase">Sobreescribe Tu Jugada.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          
          <div className="space-y-1.5">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em] flex items-center justify-between">
              FOTO DE JUGADA (CTRL+V Soportado)
            </label>
            <div className={`relative border border-dashed rounded-xl p-4 text-center transition-all bg-slate-50/50 dark:bg-black/40 cursor-pointer ${file ? 'border-brand/40 shadow-[0_0_20px_rgba(0,255,102,0.05)_inset]' : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'}`}>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="text-brand font-medium text-sm">✅ {file.name}</div>
              ) : (
                <div className="text-zinc-400 dark:text-zinc-600 flex flex-col items-center gap-2 text-[10px] font-bold tracking-[0.2em]">
                   <Upload className="w-6 h-6" />
                   TOCAR PARA SUBIR O PEGAR
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em]">ANÁLISIS SECRETO</label>
            <textarea
              className="w-full bg-white dark:bg-[#050505] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand/50 dark:focus:border-brand/50 min-h-[100px] text-sm leading-relaxed resize-none custom-scrollbar transition-colors"
              placeholder="Argumenta tu apuesta..."
              value={analisis}
              onChange={(e) => setAnalisis(e.target.value)}
            ></textarea>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/5">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              HORA DEL PRÓXIMO PRONÓSTICO
            </label>
            <input
              type="time"
              className="w-full bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl px-4 py-3 text-blue-600 dark:text-blue-500 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 text-sm font-bold tracking-wide transition-colors"
              value={proximaHora}
              onChange={(e) => setProximaHora(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-white/5">
            <label className="text-red-500 font-bold text-[10px] tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              LÍMITE MÁXIMO A APOSTAR
            </label>
            <input
              type="text"
              className="w-full bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3 text-red-600 dark:text-red-500 placeholder-red-300 dark:placeholder-red-900/50 focus:outline-none focus:border-red-400 dark:focus:border-red-500/50 text-sm font-bold tracking-wide transition-colors"
              placeholder="Ej: Solo el 5% de tu capital..."
              value={recomendacion}
              onChange={(e) => setRecomendacion(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-500 font-bold text-[10px] tracking-[0.15em]">LINK DE APUESTA</label>
            <div className="relative">
              <Link2 className="w-4 h-4 text-zinc-400 dark:text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                className="w-full bg-white dark:bg-[#050505] border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-brand/50 text-sm transition-colors"
                placeholder="https://..."
                value={linkApuesta}
                onChange={(e) => setLinkApuesta(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/5 mt-auto">
            <label className="text-brand font-bold text-[10px] tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
              TOKEN DE ACCESO
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="w-full bg-white dark:bg-[#050505] border border-slate-200 dark:border-brand/20 rounded-xl px-4 py-3 text-brand placeholder-slate-300 dark:placeholder-zinc-800 focus:outline-none focus:border-brand/50 font-mono font-black tracking-[0.2em] text-center uppercase transition-colors"
                placeholder="CREAR TOKEN"
                value={passwordLocal}
                onChange={(e) => setPasswordLocal(e.target.value.toUpperCase())}
              />
              <button 
                type="button" 
                onClick={generarPassword}
                className="px-4 bg-slate-50 dark:bg-brand/5 hover:bg-brand text-slate-800 dark:text-brand hover:text-black rounded-xl transition-colors border border-slate-200 dark:border-brand/20 flex items-center justify-center"
              >
                <RefreshCcw className="w-5 h-5" />
              </button>
            </div>
            
            {passwordLocal && (
              <div className="flex items-center justify-between text-brand mt-2 px-2">
                 <span className="text-[10px] tracking-widest uppercase font-bold opacity-70">Copiar a portapapeles:</span>
                 <button type="button" onClick={handleCopy} className="hover:text-slate-800 dark:hover:text-white p-2 bg-brand/10 rounded-lg transition-colors">
                   {copied ? <CheckCircle2 className="w-4 h-4 text-brand" /> : <Copy className="w-4 h-4 text-brand" />}
                 </button>
              </div>
            )}
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-brand text-black font-extrabold text-[13px] tracking-[0.15em] py-3.5 rounded-xl hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-3 active:scale-[0.98] shadow-sm relative"
          >
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
           <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-[0.2em] flex items-center gap-2 transition-colors">
             <Activity className="w-4 h-4" />
             VISTA PREVIA EN VIVO
           </h2>
           <span className="text-[9px] font-black text-brand bg-brand/10 px-3 py-1.5 rounded-full border border-brand/20 uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,102,0.1)]">
             CLIENTE ACTIVO
           </span>
         </div>
         
         {!currentPost ? (
           <div className="w-full max-w-2xl mt-20 py-32 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-700 border border-slate-300 dark:border-zinc-900 border-dashed rounded-3xl bg-slate-100/50 dark:bg-zinc-950/30 transition-colors">
             <RefreshCcw className="w-10 h-10 mb-4 opacity-20" />
             <p className="font-bold tracking-[0.2em] text-[10px]">NO HAY PUBLICACIÓN ACTIVA</p>
           </div>
         ) : (
           <div className="w-full max-w-4xl mt-12 bg-white dark:bg-[#0a0a0c] border border-slate-200 dark:border-zinc-800/80 rounded-[2rem] p-6 shadow-xl dark:shadow-1xl relative overflow-y-auto custom-scrollbar max-h-[85vh] transition-colors">
              
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                
                {/* Columna Izquierda (Imagen, Recom, Link) */}
                <div className="w-full lg:w-5/12 space-y-6">
                  {currentPost.imagen_url && (
                    <div className="w-full rounded-2xl overflow-hidden relative border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black transition-colors">
                       <img src={currentPost.imagen_url} className="w-full h-auto object-cover opacity-95 dark:opacity-90" alt="Preview"/>
                    </div>
                  )}

                  {currentPost.recomendacion && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 shadow-inner transition-colors">
                      <h3 className="text-red-500 text-[9px] font-black tracking-[0.2em] mb-1 flex items-center gap-2">
                         LÍMITE RECOMENDADO MÁXIMO
                      </h3>
                      <p className="text-red-600 dark:text-red-400 font-bold text-xs tracking-wide">{currentPost.recomendacion}</p>
                    </div>
                  )}

                  {currentPost.link_apuesta && (
                    <a 
                      href={currentPost.link_apuesta}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex flex-col bg-brand text-black rounded-2xl transition-all relative shadow-md hover:shadow-lg dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                    >
                      <div className="flex items-center justify-between py-4 px-5 relative z-10">
                        <span className="flex-1 text-center font-black text-[11px] md:text-[12px] tracking-[0.1em]">TOCA AQUÍ PARA HACER LA JUGADA</span>
                        <div className="bg-black/10 p-1.5 rounded-lg border border-black/5">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="bg-white/20 py-2 px-3 text-center border-t border-black/10 relative z-10">
                        <span className="text-[8px] font-bold tracking-widest opacity-80 break-all">{currentPost.link_apuesta}</span>
                      </div>
                    </a>
                  )}
                </div>

                {/* Columna Derecha (Análisis) */}
                {currentPost.analisis && (
                  <div className="w-full lg:w-7/12 bg-slate-50 dark:bg-[#050505] border border-slate-200 dark:border-white/5 rounded-2xl p-6 h-fit transition-colors">
                     <h3 className="text-[9px] font-bold text-brand mb-3 tracking-[0.2em] flex items-center gap-2">
                        INFORME VIP
                        <div className="flex-1 h-px bg-gradient-to-r from-brand/20 to-transparent ml-2"></div>
                     </h3>
                     <p className="text-slate-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
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
