import { useEffect, useState } from 'react';

export interface Carta {
  id: string;          // único por carta no tabuleiro
  pareId: string;      // mesmo valor nas duas cartas do par
  tipo: 'campeao' | 'skill';
  imagemUrl: string;
  nome: string;
}

interface Campeao {
  id: string;   // ex: "Nami"
  name: string; // ex: "Nami"
  spells: { id: string }[];
}

const VERSAO = '16.7.1';
const BASE = `https://ddragon.leagueoflegends.com/cdn/${VERSAO}`;

function embaralhar<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function useBaralho(dificuldade: 'normal' | 'dificil', qtdPares = 8) {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function montar() {
      try {
        setCarregando(true);
        setErro(null);

        // 1. Busca lista de campeões
        const res = await fetch(`${BASE}/data/pt_BR/champion.json`);
        const json = await res.json();
        const todos: Campeao[] = Object.values(json.data);

        // 2. Seleciona aleatoriamente qtdPares campeões
        const selecionados = embaralhar(todos).slice(0, qtdPares);

        // 3. Monta os pares
        let pares: Omit<Carta, 'id'>[];

        if (dificuldade === 'normal') {
          // Par: duas splash arts iguais do mesmo campeão
          pares = selecionados.flatMap((c) => {
            const url = `${BASE}/img/champion/splash/${c.id}_0.jpg`;
            return [
              { pareId: c.id, tipo: 'campeao', imagemUrl: url, nome: c.name },
              { pareId: c.id, tipo: 'campeao', imagemUrl: url, nome: c.name },
            ];
          });
        } else {
          // Par: splash art do campeão + ícone da primeira skill
          pares = selecionados.flatMap((c) => {
            const urlCampeao = `${BASE}/img/champion/splash/${c.id}_0.jpg`;
            const urlSkill = `${BASE}/img/spell/${c.spells[0].id}.png`;
            return [
              { pareId: c.id, tipo: 'campeao', imagemUrl: urlCampeao, nome: c.name },
              { pareId: c.id, tipo: 'skill',   imagemUrl: urlSkill,   nome: `${c.name} — Q` },
            ];
          });
        }

        // 4. Embaralha e adiciona id único
        const baralho: Carta[] = embaralhar(pares).map((carta, i) => ({
          ...carta,
          id: `${carta.pareId}-${carta.tipo}-${i}`,
        }));

        setCartas(baralho);
      } catch (e) {
        setErro('Erro ao carregar campeões. Tente novamente.');
        console.error(e);
      } finally {
        setCarregando(false);
      }
    }

    montar();
  }, [dificuldade, qtdPares]);

  return { cartas, carregando, erro };
}