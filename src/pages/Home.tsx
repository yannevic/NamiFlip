import useSocket from '../hooks/useSocket';

export default function Home() {
  const { conectado } = useSocket();

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">🌊 NamiFlip</h1>
        <p className="text-sm">
          Servidor:{' '}
          <span className={conectado ? 'text-green-400' : 'text-red-400'}>
            {conectado ? '🟢 conectado' : '🔴 desconectado'}
          </span>
        </p>
      </div>
    </div>
  );
}