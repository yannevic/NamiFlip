import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

// Socket criado UMA vez, fora do hook
const socket = io(SERVER_URL, { autoConnect: true });

export default function useSocket() {
  const [conectado, setConectado] = useState(socket.connected);

  useEffect(() => {
    function onConnect() { setConectado(true); }
    function onDisconnect() { setConectado(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, conectado };
}