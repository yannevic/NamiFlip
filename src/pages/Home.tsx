import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';


export default function Home() {
  const { socket, conectado } = useSocket();
  const navigate = useNavigate();

  const [apelido, setApelido] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function handleCriarSala() {
    if (!apelido.trim()) { setErro('Digite um apelido antes de continuar.'); return; }
    if (!socket) return;
    setErro('');
    setCarregando(true);
    socket.emit('criar-sala', { apelido: apelido.trim() });
    socket.once('sala-atualizada', (sala) => {
      setCarregando(false);
      navigate(`/sala/${sala.codigo}`, { state: { apelido: apelido.trim(), sala } });
    });
  }

  function handleEntrarSala() {
    if (!apelido.trim()) { setErro('Digite um apelido antes de continuar.'); return; }
    if (!codigo.trim()) { setErro('Digite o código da sala.'); return; }
    if (!socket) return;
    setErro('');
    setCarregando(true);
    socket.emit('entrar-sala', { apelido: apelido.trim(), codigo: codigo.trim() });
    socket.once('sala-atualizada', (sala) => {
      setCarregando(false);
      navigate(`/sala/${sala.codigo}`, { state: { apelido: apelido.trim(), sala } });
    });
    socket.once('erro-sala', (msg: string) => {
      setCarregando(false);
      setErro(msg);
    });
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4 relative overflow-hidden">
     

      <div className="flex flex-col items-center gap-8 w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-6xl" style={{ animation: 'float 3s ease-in-out infinite' }}>🌊</div>
          <h1 className="text-5xl font-black text-gradient" style={{ fontFamily: 'Cinzel, serif' }}>
            NamiFlip
          </h1>
          <p className="text-gray-400 text-sm tracking-wider uppercase">
            Jogo da memória · League of Legends
          </p>
          <span className="text-xs mt-1">
            {conectado
              ? <span className="text-green-400">🟢 online</span>
              : <span className="text-red-400">🔴 offline</span>
            }
          </span>
        </div>

        {/* Card principal */}
        <div className="w-full bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col gap-5">

          {/* Apelido */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Seu apelido</label>
            <input
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
              placeholder="Ex: Nana"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleCriarSala()}
            />
          </div>

          {/* Criar sala */}
          <button
            type="button"
            onClick={handleCriarSala}
            disabled={carregando || !conectado}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] glow-blue"
          >
            {carregando ? '⏳ Criando...' : '🌊 Criar sala'}
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-gray-600 text-xs uppercase tracking-wider">ou entre em uma</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Entrar */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Código da sala</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600 uppercase tracking-widest font-mono text-lg"
                placeholder="KASS"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && handleEntrarSala()}
              />
              <button
                type="button"
                onClick={handleEntrarSala}
                disabled={carregando || !conectado}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Entrar
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-900/40 rounded-lg py-2 px-3">
              ⚠️ {erro}
            </p>
          )}
        </div>

        <p className="text-gray-700 text-xs">
          Sem cadastro · 2 jogadores · multiplayer em tempo real
        </p>
      </div>
    </div>
  );
}