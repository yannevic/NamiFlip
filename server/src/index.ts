import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = 3001;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Jogador {
  id: string;
  apelido: string;
}

interface Sala {
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

interface EstadoJogo {
  turnoAtual: string;       // socket.id de quem joga agora
  placar: Record<string, number>;
  cartasViradas: string[];  // ids das cartas viradas neste turno (máx 2)
  cartasAcertadas: string[]; // pareIds já encontrados
  tempoRestante: number;    // segundos (modo coop)
}

// ─── Estado do servidor ───────────────────────────────────────────────────────
const baralhosPorSala = new Map<string, object[]>();
const salas = new Map<string, Sala>();
const dadosPorSala = new Map<string, ResultadoDado[]>();
const jogosPorSala = new Map<string, EstadoJogo>();
const timersPorSala = new Map<string, ReturnType<typeof setInterval>>();

// ─── Funções utilitárias ──────────────────────────────────────────────────────

function gerarCodigo(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let codigo = '';
  for (let i = 0; i < 4; i += 1) {
    codigo += letras[Math.floor(Math.random() * letras.length)];
  }
  return salas.has(codigo) ? gerarCodigo() : codigo;
}

function proximoTurno(jogo: EstadoJogo, sala: Sala): string {
  const [a, b] = sala.jogadores;
  return jogo.turnoAtual === a.id ? b.id : a.id;
}

function iniciarTimer(codigo: string) {
  const intervalo = setInterval(() => {
    const jogo = jogosPorSala.get(codigo);
    const sala = salas.get(codigo);
    if (!jogo || !sala) { clearInterval(intervalo); return; }

    jogo.tempoRestante -= 1;
    io.to(codigo).emit('jogo-atualizado', jogo);

    if (jogo.tempoRestante <= 0) {
      clearInterval(intervalo);
      timersPorSala.delete(codigo);
      io.to(codigo).emit('jogo-encerrado', { motivo: 'tempo', jogo });
    }
  }, 1000);
  timersPorSala.set(codigo, intervalo);
}

// ─── Socket.io ────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.send('NamiFlip server rodando! 🌊');
});

io.on('connection', (socket: Socket) => {
  console.log(`🌊 Jogador conectado: ${socket.id}`);

  // Criar sala
  socket.on('criar-sala', ({ apelido }: { apelido: string }) => {
    const codigo = gerarCodigo();
    const sala: Sala = {
      codigo,
      jogadores: [{ id: socket.id, apelido }],
      criador: socket.id,
      modo: null,
      dificuldade: null,
      status: 'aguardando',
    };
    salas.set(codigo, sala);
    socket.join(codigo);
    socket.emit('sala-atualizada', sala);
    console.log(`🌊 Sala criada: ${codigo} por ${apelido}`);
  });

  // Entrar na sala
  socket.on('entrar-sala', ({ apelido, codigo }: { apelido: string; codigo: string }) => {
    const codigoUpper = codigo.toUpperCase();
    const sala = salas.get(codigoUpper);

    if (!sala) { socket.emit('erro-sala', 'Sala não encontrada.'); return; }
    if (sala.jogadores.length >= 2) { socket.emit('erro-sala', 'Sala cheia.'); return; }
    if (sala.status !== 'aguardando') { socket.emit('erro-sala', 'Jogo já iniciado.'); return; }

    sala.jogadores.push({ id: socket.id, apelido });
    socket.join(codigoUpper);
    io.to(codigoUpper).emit('sala-atualizada', sala);
    console.log(`🌊 ${apelido} entrou na sala ${codigoUpper}`);
  });

  // Escolher modo
  socket.on('escolher-modo', ({ codigo, modo }: { codigo: string; modo: 'coop' | 'versus' }) => {
    const sala = salas.get(codigo);
    if (!sala || sala.criador !== socket.id) return;
    sala.modo = modo;
    io.to(codigo).emit('sala-atualizada', sala);
  });

  // Escolher dificuldade
  socket.on('escolher-dificuldade', ({ codigo, dificuldade }: { codigo: string; dificuldade: 'normal' | 'dificil' }) => {
    const sala = salas.get(codigo);
    if (!sala || sala.criador !== socket.id) return;
    sala.dificuldade = dificuldade;
    io.to(codigo).emit('sala-atualizada', sala);
  });

  socket.on('iniciar-partida', ({ codigo }: { codigo: string }) => {
  const sala = salas.get(codigo);
  if (!sala || sala.criador !== socket.id) return;
  io.to(codigo).emit('jogo-iniciado', { sala });
});

socket.on('iniciar-jogo', ({ codigo, primeiroJogador, cartas }) => {
  const sala = salas.get(codigo);
  if (!sala) return;

  if (jogosPorSala.has(codigo)) {
    socket.emit('jogo-atualizado', jogosPorSala.get(codigo));
    // Envia o baralho já salvo pro segundo jogador
    socket.emit('baralho-sincronizado', baralhosPorSala.get(codigo));
    return;
  }

  sala.status = 'jogando';
  const placar: Record<string, number> = {};
  sala.jogadores.forEach((j) => { placar[j.id] = 0; });

  const jogo: EstadoJogo = {
    turnoAtual: primeiroJogador,
    placar,
    cartasViradas: [],
    cartasAcertadas: [],
    tempoRestante: sala.modo === 'coop' ? 120 : 0,
  };

  jogosPorSala.set(codigo, jogo);
  baralhosPorSala.set(codigo, cartas); // ← salva o baralho
  io.to(codigo).emit('jogo-atualizado', jogo);
  io.to(codigo).emit('baralho-sincronizado', cartas); // ← envia pra os dois

  if (sala.modo === 'coop') iniciarTimer(codigo);
});

  // Rolar dado
  socket.on('rolar-dado', ({ codigo }: { codigo: string }) => {
    const sala = salas.get(codigo);
    if (!sala) return;

    const resultados = dadosPorSala.get(codigo) ?? [];
    if (resultados.some((r) => r.jogadorId === socket.id)) return;

    const valor = Math.floor(Math.random() * 6) + 1;
    resultados.push({ jogadorId: socket.id, valor });
    dadosPorSala.set(codigo, resultados);

    io.to(codigo).emit('dado-rolado', { jogadorId: socket.id, valor });

    if (resultados.length === 2) {
      const [a, b] = resultados;
      if (a.valor === b.valor) {
        dadosPorSala.set(codigo, []);
        io.to(codigo).emit('dado-empate');
      } else {
        const vencedor = a.valor > b.valor ? a.jogadorId : b.jogadorId;
        dadosPorSala.delete(codigo);
        io.to(codigo).emit('dado-resultado', { primeiroJogador: vencedor });
      }
    }
  });

  // Iniciar jogo — chamado pelo frontend quando chega na tela do jogo
  socket.on('iniciar-jogo', ({ codigo, primeiroJogador }: { codigo: string; primeiroJogador: string }) => {
    const sala = salas.get(codigo);
    if (!sala) return;

    // Evita reiniciar se já existe
    if (jogosPorSala.has(codigo)) {
      socket.emit('jogo-atualizado', jogosPorSala.get(codigo));
      return;
    }

    sala.status = 'jogando';

    const placar: Record<string, number> = {};
    sala.jogadores.forEach((j) => { placar[j.id] = 0; });

    const jogo: EstadoJogo = {
      turnoAtual: primeiroJogador,
      placar,
      cartasViradas: [],
      cartasAcertadas: [],
      tempoRestante: sala.modo === 'coop' ? 120 : 0,
    };

    jogosPorSala.set(codigo, jogo);
    io.to(codigo).emit('jogo-atualizado', jogo);

    if (sala.modo === 'coop') {
      iniciarTimer(codigo);
    }
  });

  // Virar carta
  socket.on('virar-carta', ({ codigo, cartaId, pareId }: { codigo: string; cartaId: string; pareId: string }) => {
    const sala = salas.get(codigo);
    const jogo = jogosPorSala.get(codigo);
    if (!sala || !jogo) return;

    // Só quem é da vez pode jogar
    if (jogo.turnoAtual !== socket.id) return;

    // Carta já acertada ou já virada
    if (jogo.cartasAcertadas.includes(pareId)) return;
    if (jogo.cartasViradas.includes(cartaId)) return;
    if (jogo.cartasViradas.length >= 2) return;

    jogo.cartasViradas.push(cartaId);
    io.to(codigo).emit('jogo-atualizado', jogo);

    if (jogo.cartasViradas.length === 2) {
      // Busca os pareIds das duas cartas viradas
      // O frontend envia pareId junto com cartaId, então guardamos no evento
      // Precisamos de ambos os pareIds — usamos um Map temporário
      const [primeiraId] = jogo.cartasViradas;
      // pareId da primeira carta foi guardado quando ela foi virada
      // Para isso, guardamos um map de cartaId → pareId no estado do jogo
      // Simplificação: o pareId é a primeira parte do cartaId (formato: "{pareId}-{tipo}-{index}")
      const pareIdA = primeiraId.split('-')[0];
      const pareIdB = pareId;

      setTimeout(() => {
        if (pareIdA === pareIdB) {
          // Acertou
          jogo.cartasAcertadas.push(pareIdA);
          jogo.placar[socket.id] = (jogo.placar[socket.id] ?? 0) + 1;
          jogo.cartasViradas = [];
          // Quem acerta joga de novo — turno não muda

          const totalPares = 8;
          if (jogo.cartasAcertadas.length === totalPares) {
            // Fim de jogo
            const timer = timersPorSala.get(codigo);
            if (timer) { clearInterval(timer); timersPorSala.delete(codigo); }
            io.to(codigo).emit('jogo-atualizado', jogo);
            io.to(codigo).emit('jogo-encerrado', { motivo: 'completo', jogo });
          } else {
            io.to(codigo).emit('jogo-atualizado', jogo);
          }
        } else {
          // Errou — passa o turno
          jogo.cartasViradas = [];
          jogo.turnoAtual = proximoTurno(jogo, sala);
          io.to(codigo).emit('jogo-atualizado', jogo);
        }
      }, 1000);
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    console.log(`🌊 Jogador desconectado: ${socket.id}`);
    salas.forEach((sala, codigo) => {
      const index = sala.jogadores.findIndex((j) => j.id === socket.id);
      if (index === -1) return;
      sala.jogadores.splice(index, 1);

      const timer = timersPorSala.get(codigo);
      if (timer) { clearInterval(timer); timersPorSala.delete(codigo); }

      if (sala.jogadores.length === 0) {
        salas.delete(codigo);
        dadosPorSala.delete(codigo);
        jogosPorSala.delete(codigo);
        baralhosPorSala.delete(codigo);
        console.log(`🌊 Sala ${codigo} removida`);
      } else {
        io.to(codigo).emit('adversario-desconectou');
      }
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`🌊 Servidor rodando na porta ${PORT}`);
});