import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
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

app.get('/', (_req, res) => {
  res.send('NamiFlip server rodando! 🌊');
});

io.on('connection', (socket) => {
  console.log(`🌊 Jogador conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🌊 Jogador desconectado: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🌊 Servidor rodando na porta ${PORT}`);
});