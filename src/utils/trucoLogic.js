// Utilidades de Lógica do Truco (Baralho de 40 Cartas e Manilha Dinâmica)

export const SUITS = [
  { symbol: '♣', name: 'Paus', color: 'text-emerald-400', isRed: false, rank: 4 }, // Zap
  { symbol: '♥', name: 'Copas', color: 'text-red-500', isRed: true, rank: 3 },     // Copas
  { symbol: '♠', name: 'Espadas', color: 'text-slate-200', isRed: false, rank: 2 }, // Espadilha
  { symbol: '♦', name: 'Ouros', color: 'text-amber-400', isRed: true, rank: 1 }    // Pica-fumo
];

export const VALUES_ORDER = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

// Retorna a manilha com base no vira
export function getManilhaValue(viraValue) {
  const index = VALUES_ORDER.indexOf(viraValue);
  if (index === -1) return '4';
  return VALUES_ORDER[(index + 1) % VALUES_ORDER.length];
}

// Retorna o valor numérico para comparação entre duas cartas
export function getCardStrength(card, vira) {
  if (!card) return -1;
  
  const manilhaValue = getManilhaValue(vira.value);
  
  // Se for manilha, o peso depende do naipe (Zap > Copas > Espadas > Ouros)
  if (card.value === manilhaValue) {
    const suitObj = SUITS.find(s => s.symbol === card.suit);
    const suitRank = suitObj ? suitObj.rank : 0;
    return 1000 + suitRank; // 1004, 1003, 1002, 1001
  }
  
  // Cartas normais usam o índice base
  return VALUES_ORDER.indexOf(card.value);
}

// Compara duas cartas: >0 se cardA vence, <0 se cardB vence, 0 se empata (canga)
export function compareCards(cardA, cardB, vira) {
  const strengthA = getCardStrength(cardA, vira);
  const strengthB = getCardStrength(cardB, vira);
  return strengthA - strengthB;
}

// Cria um baralho limpo de 40 cartas
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES_ORDER) {
      deck.push({
        id: `${value}${suit.symbol}`,
        value,
        suit: suit.symbol,
        isRed: suit.isRed,
        hidden: false
      });
    }
  }
  return deck;
}

// PRNG Pseudo-Random Number Generator baseado em Seed (Mulberry32)
export function seededRandom(seed) {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Embaralhamento determinístico por seed
export function shuffleDeck(deck, seedStr) {
  let seedNum = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seedNum = (seedNum << 5) - seedNum + seedStr.charCodeAt(i);
    seedNum |= 0;
  }
  
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = seededRandom(seedNum + i);
    const j = Math.floor(r * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
