import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Bolhas from './components/Bolhas';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Sala from './pages/Sala';
import Jogo from './pages/Jogo';
import Dados from './pages/Dados';

export default function App() {
  return (
    <BrowserRouter>
      <Bolhas />
      <div className="relative conteudo-app" style={{ zIndex: 2, pointerEvents: 'none' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/sala/:codigo" element={<Sala />} />
          <Route path="/dados/:codigo" element={<Dados />} />
          <Route path="/jogo/:codigo" element={<Jogo />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
