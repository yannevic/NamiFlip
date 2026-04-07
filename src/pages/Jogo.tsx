import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBaralho, type Carta } from '../hooks/useBaralho';
import useSocket from '../hooks/useSocket';

interface SalaState {
  codigo: string;
  jogadores: { id: string; apelido: string }[];
  modo: 'coop' | 'versus';
  dificuldade: 'normal' | 'dificil';
}

interface EstadoJogo {
  turnoAtual: string;
  placar: Record<string, number>;
  cartasViradas: string[];
  cartasAcertadas: string[];
  tempoRestante: number;
}

export default function Jogo() {
  const { codigo } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const sala = location.state?.sala as SalaState;
  const apelido = location.state?.apelido as string;
  const primeiroJogador = location.state?.primeiroJogador as string | undefined;

  const dificuldade = sala?.dificuldade ?? 'normal';

  // Baralho gerado localmente — só usado pelo primeiro a chegar para enviar ao servidor
  const { cartas: cartasGeradas, carregando: carregandoBaralho } = useBaralho(dificuldade);

  // Baralho sincronizado — recebido do servidor, usado por ambos os jogadores
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro] = useState<string | null>(null);

  const [jogo, setJogo] = useState<EstadoJogo | null>(null);
  const [encerrado, setEncerrado] = useState<{ motivo: string; jogo: EstadoJogo } | null>(null);

  const meuId = socket?.id ?? '';
  const meuTurno = jogo?.turnoAtual === meuId;

  function nomeJogador(id: string) {
    return sala?.jogadores.find((j) => j.id === id)?.apelido ?? id;
  }

  // Envia o baralho gerado ao servidor quando estiver pronto
  // O servidor repassa o mesmo baralho para os dois jogadores via 'baralho-sincronizado'
  useEffect(() => {
    if (!socket || carregandoBaralho || cartasGeradas.length === 0) return;
    const primeiro = primeiroJogador ?? sala.jogadores[0].id;
    socket.emit('iniciar-jogo', {
      codigo,
      primeiroJogador: primeiro,
      cartas: cartasGeradas, // ← envia o baralho junto
    });
  }, [socket, carregandoBaralho, cartasGeradas.length, codigo, primeiroJogador, sala]);

  useEffect(() => {
    if (!socket) return;

    // Recebe o baralho sincronizado do servidor (igual para os dois jogadores)
    socket.on('baralho-sincronizado', (cartasRecebidas: Carta[]) => {
      setCartas(cartasRecebidas);
      setCarregando(false);
    });

    socket.on('jogo-atualizado', (novoJogo: EstadoJogo) => {
      setJogo(novoJogo);
    });

    socket.on('jogo-encerrado', (dados: { motivo: string; jogo: EstadoJogo }) => {
      setEncerrado(dados);
    });

    socket.on('adversario-desconectou', () => {
      alert('O adversário desconectou.');
      navigate('/');
    });

    return () => {
      socket.off('baralho-sincronizado');
      socket.off('jogo-atualizado');
      socket.off('jogo-encerrado');
      socket.off('adversario-desconectou');
    };
  }, [socket, navigate]);

  function virarCarta(carta: Carta) {
    if (!socket || !jogo) return;
    if (!meuTurno) return;
    if (jogo.cartasAcertadas.includes(carta.pareId)) return;
    if (jogo.cartasViradas.includes(carta.id)) return;
    if (jogo.cartasViradas.length >= 2) return;

    socket.emit('virar-carta', {
      codigo,
      cartaId: carta.id,
      pareId: carta.pareId,
    });
  }

  function estaVisivel(carta: Carta) {
    if (!jogo) return false;
    return jogo.cartasViradas.includes(carta.id) || jogo.cartasAcertadas.includes(carta.pareId);
  }

  function formatarTempo(seg: number) {
    const m = Math.floor(seg / 60).toString().padStart(2, '0');
    const s = (seg % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  if (carregando || !jogo) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-blue-400 animate-pulse">🌊 Carregando...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{erro}</p>
        <button type="button" onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm">
          ← Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-2xl">
        <h1 className="text-blue-400 font-bold text-lg">🌊 NamiFlip</h1>

        {sala.modo === 'coop' && (
          <span className={`font-mono font-bold text-lg ${jogo.tempoRestante <= 30 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            ⏱ {formatarTempo(jogo.tempoRestante)}
          </span>
        )}

        <button type="button" onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-400 text-sm">
          ← Sair
        </button>
      </div>

      {/* Placar */}
      <div className="flex gap-4 w-full max-w-2xl">
        {sala.jogadores.map((jogador) => (
          <div
            key={jogador.id}
            className={`flex-1 flex items-center justify-between px-4 py-2 rounded-xl border transition-all
              ${jogo.turnoAtual === jogador.id
                ? 'bg-blue-900/40 border-blue-500'
                : 'bg-gray-900 border-gray-800'
              }`}
          >
            <span className="text-sm font-semibold">
              {jogador.apelido}
              {jogador.apelido === apelido && <span className="text-gray-500 ml-1 text-xs">(você)</span>}
              {jogo.turnoAtual === jogador.id && <span className="text-blue-400 ml-2 text-xs">▶</span>}
            </span>
            <span className="text-xl font-bold text-blue-400">{jogo.placar[jogador.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Indicador de turno */}
      <p className={`text-sm font-semibold ${meuTurno ? 'text-green-400' : 'text-gray-500'}`}>
        {meuTurno ? '✅ Sua vez!' : `⏳ Vez de ${nomeJogador(jogo.turnoAtual)}...`}
      </p>

      {/* Tabuleiro com flip 3D */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-2xl">
        {cartas.map((carta) => {
          const visivel = estaVisivel(carta);
          const acertou = jogo.cartasAcertadas.includes(carta.pareId);
          const podeClicar = meuTurno && !visivel && jogo.cartasViradas.length < 2;

          return (
            <div
              key={carta.id}
              className={`aspect-square carta-container ${podeClicar ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => virarCarta(carta)}
            >
              <div className={`carta-inner ${visivel ? 'virada' : ''}`}>
                {/* Frente — verso da carta */}
                <div className={`carta-frente bg-gray-800 border-2 flex items-center justify-center text-3xl
                  ${podeClicar ? 'border-gray-700 hover:border-blue-400' : 'border-gray-800'}
                  transition-colors`}
                >
                  🌊
                </div>
                {/* Verso — imagem */}
                <div className={`carta-verso border-2 
                  ${acertou ? 'border-green-500 glow-green' : 'border-blue-400 glow-blue'}`}
                >
                  <img src={carta.imagemUrl} alt={carta.nome} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de fim de jogo */}
      {encerrado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-6 w-full max-w-sm">
            {encerrado.motivo === 'tempo' ? (
              <>
                <p className="text-4xl">⏰</p>
                <p className="text-red-400 font-bold text-xl">Tempo esgotado!</p>
              </>
            ) : (
              <>
                <p className="text-4xl">🏆</p>
                <p className="text-green-400 font-bold text-xl">Jogo encerrado!</p>
              </>
            )}

            {/* Placar final */}
            <div className="flex flex-col gap-2 w-full">
              {sala.jogadores
                .slice()
                .sort((a, b) => (encerrado.jogo.placar[b.id] ?? 0) - (encerrado.jogo.placar[a.id] ?? 0))
                .map((jogador, i) => (
                  <div key={jogador.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                    <span className="font-semibold">
                      {i === 0 && sala.modo === 'versus' && <span className="mr-2">👑</span>}
                      {jogador.apelido}
                      {jogador.apelido === apelido && <span className="text-gray-500 ml-1 text-xs">(você)</span>}
                    </span>
                    <span className="text-blue-400 font-bold text-lg">{encerrado.jogo.placar[jogador.id] ?? 0}</span>
                  </div>
                ))}
            </div>

            {sala.modo === 'coop' && (
              <p className={encerrado.motivo === 'completo' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                {encerrado.motivo === 'completo' ? '🎉 Vocês venceram!' : '💀 Vocês perderam!'}
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
            >
              Jogar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
