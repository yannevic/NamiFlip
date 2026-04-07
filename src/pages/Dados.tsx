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

interface ResultadoDado {
  jogadorId: string;
  valor: number;
}

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function Dados() {
  const { codigo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const sala = location.state?.sala as SalaState;
  const apelido = location.state?.apelido as string;

  const [resultados, setResultados] = useState<Record<string, number>>({});
  const [animando, setAnimando] = useState<Record<string, boolean>>({});
  const [empate, setEmpate] = useState(false);
  const [primeiroJogador, setPrimeiroJogador] = useState<string | null>(null);
  const [euJaRolei, setEuJaRolei] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('dado-rolado', ({ jogadorId, valor }: ResultadoDado) => {
      // Animação de 1s antes de mostrar o valor
      setAnimando((prev) => ({ ...prev, [jogadorId]: true }));
      setTimeout(() => {
        setAnimando((prev) => ({ ...prev, [jogadorId]: false }));
        setResultados((prev) => ({ ...prev, [jogadorId]: valor }));
      }, 1000);
    });

    socket.on('dado-empate', () => {
      setTimeout(() => {
        setEmpate(true);
        setResultados({});
        setAnimando({});
        setEuJaRolei(false);
      }, 1200);
    });

    socket.on('dado-resultado', ({ primeiroJogador: primeiro }: { primeiroJogador: string }) => {
      setPrimeiroJogador(primeiro);
      setTimeout(() => {
        navigate(`/jogo/${codigo}`, {
          state: { sala, apelido, primeiroJogador: primeiro },
        });
      }, 2500);
    });

    return () => {
      socket.off('dado-rolado');
      socket.off('dado-empate');
      socket.off('dado-resultado');
    };
  }, [socket, codigo, sala, apelido, navigate]);

  function rolar() {
    if (euJaRolei || !socket) return;
    setEuJaRolei(true);
    setEmpate(false);
    socket.emit('rolar-dado', { codigo });
  }

  function nomeJogador(id: string) {
    return sala.jogadores.find((j) => j.id === id)?.apelido ?? id;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-blue-400">⚔️ Quem começa?</h1>
        <p className="text-gray-400 text-sm">Maior número inicia o jogo</p>
      </div>

      {/* Dados dos dois jogadores */}
      <div className="flex gap-8">
        {sala.jogadores.map((jogador) => {
          const esteAnimando = animando[jogador.id];
          const valor = resultados[jogador.id];
          const euSouEste = jogador.apelido === apelido;

          return (
            <div key={jogador.id} className="flex flex-col items-center gap-3">
              <span className="text-sm text-gray-400">
                {jogador.apelido}
                {euSouEste && <span className="text-gray-600 ml-1">(você)</span>}
              </span>
              <div
                className={`
                  text-7xl transition-all select-none
                  ${esteAnimando ? 'animate-bounce' : ''}
                  ${primeiroJogador === jogador.id ? 'drop-shadow-[0_0_12px_rgba(96,165,250,0.8)]' : ''}
                `}
              >
                {esteAnimando ? '🎲' : valor ? FACES[valor] : '🎲'}
              </div>
              {valor && !esteAnimando && (
                <span className={`text-lg font-bold ${primeiroJogador === jogador.id ? 'text-green-400' : 'text-gray-500'}`}>
                  {valor}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Empate */}
      {empate && (
        <p className="text-yellow-400 font-semibold animate-pulse">
          🤝 Empate! Rolem de novo.
        </p>
      )}

      {/* Resultado */}
      {primeiroJogador && (
        <p className="text-green-400 font-bold text-lg">
          {primeiroJogador === socket?.id ? '🎉 Você começa!' : `${nomeJogador(primeiroJogador)} começa!`}
        </p>
      )}

      {/* Botão rolar */}
      {!primeiroJogador && (
        <button
          type="button"
          onClick={rolar}
          disabled={euJaRolei}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-colors"
        >
          {euJaRolei ? '⏳ Aguardando...' : '🎲 Rolar dado'}
        </button>
      )}
    </div>
  );
}