import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';

interface Jogador {
  id: string;
  apelido: string;
}

interface SalaState {
  codigo: string;
  jogadores: Jogador[];
  criador: string;
  modo: 'coop' | 'versus' | null;
  dificuldade: 'normal' | 'dificil' | null;
  status: 'aguardando' | 'jogando';
}

export default function Sala() {
  const { codigo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, conectado } = useSocket();

  const [sala, setSala] = useState<SalaState | null>(location.state?.sala ?? null);
  const apelido = location.state?.apelido ?? '';

  const euSouCriador = socket?.id === sala?.criador;
  const doisJogadores = (sala?.jogadores.length ?? 0) >= 2;
  const modoPronto = sala?.modo !== null;
  const dificuldadePronta = sala?.dificuldade !== null;
  const tudoPronto = doisJogadores && modoPronto && dificuldadePronta;

  useEffect(() => {
    if (!socket) return;

    socket.on('jogo-iniciado', ({ sala }: { sala: SalaState }) => {
  if (sala.modo === 'versus') {
    navigate(`/dados/${codigo}`, { state: { sala, apelido } });
  } else {
    navigate(`/jogo/${codigo}`, { state: { sala, apelido } });
  }
});

    socket.on('sala-atualizada', (novaSala: SalaState) => {
      setSala(novaSala);
    });

    socket.on('erro-sala', (msg: string) => {
      alert(msg);
      navigate('/');
    });

    return () => {
      socket.off('sala-atualizada');
      socket.off('erro-sala');
      socket.off('jogo-iniciado'); // ← adiciona
    };
  }, [socket, navigate, apelido, codigo]);

  function escolherModo(modo: 'coop' | 'versus') {
    socket?.emit('escolher-modo', { codigo, modo });
  }

  function escolherDificuldade(dificuldade: 'normal' | 'dificil') {
    socket?.emit('escolher-dificuldade', { codigo, dificuldade });
  }

  function iniciarJogo() {
  socket?.emit('iniciar-partida', { codigo });
}

  if (!sala) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando sala...</p>
      </div>
    );
  }

  const aguardando = sala.jogadores.length < 2;

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">

        {/* Código da sala */}
        <div className="flex flex-col items-center gap-1">
          <p className="text-gray-400 text-sm">Código da sala</p>
          <h2 className="text-5xl font-bold tracking-widest text-blue-400">{codigo}</h2>
          <p className="text-gray-500 text-xs">Compartilhe com seu amigo</p>
        </div>

        {/* Jogadores */}
        <div className="flex flex-col gap-3 w-full">
          {sala.jogadores.map((jogador) => (
            <div
              key={jogador.id}
              className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3"
            >
              <span className="text-2xl">🌊</span>
              <span className="font-semibold">
                {jogador.apelido}
                {jogador.apelido === apelido && (
                  <span className="text-xs text-gray-500 ml-2">(você)</span>
                )}
                {jogador.id === sala.criador && (
                  <span className="text-xs text-blue-400 ml-2">👑</span>
                )}
              </span>
            </div>
          ))}

          {aguardando && (
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 border-dashed rounded-xl px-4 py-3 opacity-40">
              <span className="text-2xl">⏳</span>
              <span className="text-gray-500">Aguardando jogador...</span>
            </div>
          )}
        </div>

        {/* Escolha de modo */}
        {doisJogadores && (
          <div className="flex flex-col gap-3 w-full">
            <p className="text-gray-400 text-sm text-center">
              {euSouCriador ? 'Escolha o modo de jogo:' : 'Aguardando o criador escolher o modo...'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!euSouCriador}
                onClick={() => escolherModo('coop')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border
                  ${sala.modo === 'coop'
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                🤝 Cooperativo
              </button>
              <button
                type="button"
                disabled={!euSouCriador}
                onClick={() => escolherModo('versus')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border
                  ${sala.modo === 'versus'
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                ⚔️ Versus
              </button>
            </div>
          </div>
        )}

        {/* Escolha de dificuldade */}
        {doisJogadores && modoPronto && (
          <div className="flex flex-col gap-3 w-full">
            <p className="text-gray-400 text-sm text-center">
              {euSouCriador ? 'Escolha a dificuldade:' : 'Aguardando o criador escolher a dificuldade...'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!euSouCriador}
                onClick={() => escolherDificuldade('normal')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border
                  ${sala.dificuldade === 'normal'
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                🖼️ Normal
              </button>
              <button
                type="button"
                disabled={!euSouCriador}
                onClick={() => escolherDificuldade('dificil')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all border
                  ${sala.dificuldade === 'dificil'
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
              >
                ⚡ Difícil
              </button>
            </div>
          </div>
        )}

        {/* Botão iniciar — só criador vê */}
        {tudoPronto && euSouCriador && (
          <button
            type="button"
            onClick={iniciarJogo}
            className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
          >
            🚀 Iniciar jogo
          </button>
        )}

        {/* Mensagem pro outro jogador */}
        {tudoPronto && !euSouCriador && (
          <p className="text-green-400 text-sm font-semibold text-center">
            ✅ Tudo pronto! Aguardando o criador iniciar...
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
        >
          ← Voltar ao início
        </button>

        <span className="text-xs">
          {conectado
            ? <span className="text-green-400">🟢 online</span>
            : <span className="text-red-400">🔴 offline</span>
          }
        </span>
      </div>
    </div>
  );
}