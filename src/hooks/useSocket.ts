import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export default function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL);

    s.on('connect', () => {
      console.log('🌊 Conectado ao servidor:', s.id);
      setConectado(true);
    });

    s.on('disconnect', () => {
      console.log('🌊 Desconectado do servidor');
      setConectado(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return { socket, conectado };
}