import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));


const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Constantes do Baralho de 40 Cartas (sem 8, 9, 10)
const SUITS = [
  { symbol: '♣', name: 'Paus', rank: 4 }, // Zap
  { symbol: '♥', name: 'Copas', rank: 3 }, // Copas
  { symbol: '♠', name: 'Espadas', rank: 2 }, // Espadilha
  { symbol: '♦', name: 'Ouros', rank: 1 }  // Pica-fumo
];

const VALUES_ORDER = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function getManilhaValue(viraValue) {
  const index = VALUES_ORDER.indexOf(viraValue);
  if (index === -1) return '4';
  return VALUES_ORDER[(index + 1) % VALUES_ORDER.length];
}

function getCardStrength(card, viraValue) {
  if (!card) return -1;
  const manilhaValue = getManilhaValue(viraValue);
  
  if (card.value === manilhaValue) {
    const suitObj = SUITS.find(s => s.symbol === card.suit);
    const suitRank = suitObj ? suitObj.rank : 0;
    return 1000 + suitRank;
  }
  return VALUES_ORDER.indexOf(card.value);
}

function compareCards(cardA, cardB, viraValue) {
  const strengthA = getCardStrength(cardA, viraValue);
  const strengthB = getCardStrength(cardB, viraValue);
  return strengthA - strengthB;
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES_ORDER) {
      deck.push({
        id: `${value}${suit.symbol}`,
        value,
        suit: suit.symbol,
        isRed: suit.symbol === '♥' || suit.symbol === '♦'
      });
    }
  }
  return deck;
}

function seededRandom(seed) {
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffleDeck(deck, seedStr) {
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

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Repositório em memória das salas
const rooms = {};

function sanitizeRoomState(room, requestingPlayerId) {
  if (!room) return null;

  const sanitizedPlayers = room.players.map(p => {
    const isSelf = p.playerId === requestingPlayerId;
    return {
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      connected: p.connected,
      cardCount: p.hand ? p.hand.length : 0,
      // Apenas envia as cartas para o próprio jogador
      hand: isSelf ? p.hand : p.hand ? p.hand.map(c => ({ id: 'BACK', hidden: true })) : []
    };
  });

  return {
    roomId: room.roomId,
    status: room.status,
    maxPlayers: room.maxPlayers,
    players: sanitizedPlayers,
    scores: room.scores,
    currentHand: room.currentHand ? {
      vira: room.currentHand.vira,
      manilha: room.currentHand.manilha,
      handValue: room.currentHand.handValue,
      turnPlayerId: room.currentHand.turnPlayerId,
      currentRoundIndex: room.currentHand.currentRoundIndex,
      rounds: room.currentHand.rounds,
      playedCardsThisRound: room.currentHand.playedCardsThisRound.map(pc => ({
        playerId: pc.playerId,
        team: pc.team,
        card: pc.hidden && pc.playerId !== requestingPlayerId ? { id: 'BACK', hidden: true } : pc.card,
        hidden: pc.hidden
      })),
      trucoState: room.currentHand.trucoState,
      handWinners: room.currentHand.handWinners,
      lastActionMsg: room.currentHand.lastActionMsg
    } : null,
    winnerTeam: room.winnerTeam || null
  };
}

function broadcastRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.players.forEach(player => {
    if (player.socketId) {
      const sanitized = sanitizeRoomState(room, player.playerId);
      io.to(player.socketId).emit('roomStateUpdate', sanitized);
    }
  });
}

function startNewHand(room) {
  const seed = Math.random().toString(36).substring(2, 10);
  const deck = shuffleDeck(createDeck(), seed);

  // Distribuir 3 cartas para cada jogador
  let cardIdx = 0;
  room.players.forEach(p => {
    p.hand = [deck[cardIdx++], deck[cardIdx++], deck[cardIdx++]];
  });

  const vira = deck[cardIdx++];
  const manilha = getManilhaValue(vira.value);

  // Definir quem começa a mão (rotativo)
  const starterIndex = (room.starterPlayerIndex ?? -1) + 1;
  const actualStarterIdx = starterIndex % room.players.length;
  room.starterPlayerIndex = actualStarterIdx;
  const starterPlayer = room.players[actualStarterIdx];

  room.status = 'PLAYING';
  room.currentHand = {
    seed,
    vira,
    manilha,
    handValue: 1,
    currentRoundIndex: 0,
    turnPlayerId: starterPlayer.playerId,
    roundStarterPlayerId: starterPlayer.playerId,
    playedCardsThisRound: [],
    rounds: [], // [{ winnerTeam: 1 | 2 | 'TIE', cardsPlayed: [] }]
    handWinners: { team1Wins: 0, team2Wins: 0 },
    trucoState: {
      status: 'NONE', // 'NONE', 'PENDING'
      callingPlayerId: null,
      callingTeam: null,
      targetTeam: null,
      currentLevel: 1,
      pendingLevel: 3,
      lastTrucoTeam: null // Para impedir que o mesmo time peça truco seguido
    },
    lastActionMsg: `Nova mão iniciada! Vira: ${vira.value}${vira.suit}. Vez de ${starterPlayer.name}`
  };
}

function checkHandWinner(room) {
  const hand = room.currentHand;
  const rounds = hand.rounds;

  let team1Wins = 0;
  let team2Wins = 0;
  let ties = 0;

  rounds.forEach(r => {
    if (r.winnerTeam === 1) team1Wins++;
    else if (r.winnerTeam === 2) team2Wins++;
    else if (r.winnerTeam === 'TIE') ties++;
  });

  hand.handWinners = { team1Wins, team2Wins };

  let winningTeam = null;

  if (team1Wins >= 2) winningTeam = 1;
  else if (team2Wins >= 2) winningTeam = 2;
  else if (rounds.length === 3) {
    if (team1Wins > team2Wins) winningTeam = 1;
    else if (team2Wins > team1Wins) winningTeam = 2;
  }

  // Regras de Empate (Canga)
  if (!winningTeam) {
    if (rounds.length === 1 && rounds[0].winnerTeam === 'TIE') {
      // Se a 1ª rodada empatar, quem vencer a 2ª ganha a mão
    } else if (rounds.length === 2) {
      if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam !== 'TIE') {
        winningTeam = rounds[1].winnerTeam;
      } else if (rounds[0].winnerTeam !== 'TIE' && rounds[1].winnerTeam === 'TIE') {
        winningTeam = rounds[0].winnerTeam;
      }
    } else if (rounds.length === 3) {
      if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam === 'TIE' && rounds[2].winnerTeam !== 'TIE') {
        winningTeam = rounds[2].winnerTeam;
      } else if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam === 'TIE' && rounds[2].winnerTeam === 'TIE') {
        // As 3 empataram: ninguém pontua, reinicia mão
        hand.lastActionMsg = 'As 3 rodadas empataram! Ninguém pontua.';
        setTimeout(() => {
          startNewHand(room);
          broadcastRoomState(room.roomId);
        }, 2500);
        return;
      }
    }
  }

  if (winningTeam) {
    const pointsAwarded = hand.handValue;
    if (winningTeam === 1) room.scores.team1 += pointsAwarded;
    else room.scores.team2 += pointsAwarded;

    hand.lastActionMsg = `Time ${winningTeam} venceu a mão e ganhou ${pointsAwarded} ponto(s)!`;

    // Verifica se algum time atingiu 12 pontos
    if (room.scores.team1 >= 12 || room.scores.team2 >= 12) {
      room.status = 'GAME_OVER';
      room.winnerTeam = room.scores.team1 >= 12 ? 1 : 2;
      hand.lastActionMsg = `FIM DE JOGO! Time ${room.winnerTeam} é o campeão!`;
      broadcastRoomState(room.roomId);
    } else {
      setTimeout(() => {
        startNewHand(room);
        broadcastRoomState(room.roomId);
      }, 3000);
    }
  } else {
    // Próxima rodada
    hand.currentRoundIndex++;
    hand.playedCardsThisRound = [];
    broadcastRoomState(room.roomId);
  }
}

function evaluateRound(room) {
  const hand = room.currentHand;
  const played = hand.playedCardsThisRound;
  
  if (played.length < room.players.length) return;

  // Encontrar a carta mais forte jogada nesta rodada
  let highestCard = null;
  let roundWinnerPlayerId = null;
  let isTie = false;

  played.forEach(p => {
    if (!highestCard) {
      highestCard = p.card;
      roundWinnerPlayerId = p.playerId;
    } else {
      const cmp = compareCards(p.card, highestCard, hand.vira.value);
      if (cmp > 0) {
        highestCard = p.card;
        roundWinnerPlayerId = p.playerId;
        isTie = false;
      } else if (cmp === 0) {
        isTie = true;
      }
    }
  });

  const winnerPlayer = room.players.find(p => p.playerId === roundWinnerPlayerId);
  const winnerTeam = isTie ? 'TIE' : winnerPlayer.team;

  hand.rounds.push({
    winnerTeam,
    winnerPlayerId: isTie ? null : roundWinnerPlayerId,
    cardsPlayed: [...played]
  });

  if (isTie) {
    hand.lastActionMsg = `Rodada ${hand.currentRoundIndex + 1} EMPATOU!`;
    // Em caso de empate, mantém o mesmo jogador para iniciar a próxima rodada
  } else {
    hand.lastActionMsg = `${winnerPlayer.name} (Time ${winnerTeam}) venceu a ${hand.currentRoundIndex + 1}ª rodada!`;
    hand.turnPlayerId = roundWinnerPlayerId;
    hand.roundStarterPlayerId = roundWinnerPlayerId;
  }

  checkHandWinner(room);
}

// Eventos de Conexão Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  // 1. Criar Sala
  socket.on('createRoom', ({ name, maxPlayers = 2 }, callback) => {
    const roomId = generateRoomCode();
    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;

    const player = {
      id: socket.id,
      playerId,
      name: name || 'Jogador 1',
      socketId: socket.id,
      team: 1,
      connected: true,
      hand: []
    };

    rooms[roomId] = {
      roomId,
      maxPlayers: Number(maxPlayers) || 2,
      players: [player],
      status: 'LOBBY',
      scores: { team1: 0, team2: 0 },
      starterPlayerIndex: 0
    };

    socket.join(roomId);
    if (callback) callback({ success: true, roomId, playerId, player });
    broadcastRoomState(roomId);
  });

  // 2. Entrar na Sala
  socket.on('joinRoom', ({ roomId, name, playerId }, callback) => {
    const room = rooms[roomId?.toUpperCase()];

    if (!room) {
      if (callback) callback({ success: false, message: 'Sala não encontrada!' });
      return;
    }

    // Verificar se é reconexão
    let existingPlayer = room.players.find(p => p.playerId === playerId);

    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      if (name) existingPlayer.name = name;
      socket.join(room.roomId);

      if (callback) callback({ success: true, roomId: room.roomId, playerId: existingPlayer.playerId, player: existingPlayer });
      broadcastRoomState(room.roomId);
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      if (callback) callback({ success: false, message: 'Sala cheia!' });
      return;
    }

    const newPlayerId = playerId || `p_${Math.random().toString(36).substring(2, 9)}`;
    const team = (room.players.length % 2) + 1; // Alterna Time 1 e Time 2

    const player = {
      id: socket.id,
      playerId: newPlayerId,
      name: name || `Jogador ${room.players.length + 1}`,
      socketId: socket.id,
      team,
      connected: true,
      hand: []
    };

    room.players.push(player);
    socket.join(room.roomId);

    if (callback) callback({ success: true, roomId: room.roomId, playerId: newPlayerId, player });
    broadcastRoomState(room.roomId);
  });

  // 3. Iniciar Jogo
  socket.on('startGame', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) return;
    if (room.players.length < 2) return;

    startNewHand(room);
    broadcastRoomState(roomId);
  });

  // 4. Jogar Carta
  socket.on('playCard', ({ roomId, playerId, cardId, hidden = false }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;

    const hand = room.currentHand;
    if (!hand || hand.turnPlayerId !== playerId) return; // Validação de Turno

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return; // Carta não encontrada na mão

    const [playedCard] = player.hand.splice(cardIndex, 1);
    if (hidden) playedCard.hidden = true;

    hand.playedCardsThisRound.push({
      playerId,
      team: player.team,
      card: playedCard,
      hidden
    });

    hand.lastActionMsg = `${player.name} jogou ${hidden ? 'uma carta coberta' : `${playedCard.value}${playedCard.suit}`}`;

    // Passar o turno para o próximo jogador
    const currentIdx = room.players.findIndex(p => p.playerId === playerId);
    const nextIdx = (currentIdx + 1) % room.players.length;
    hand.turnPlayerId = room.players[nextIdx].playerId;

    broadcastRoomState(roomId);

    // Se todos os jogadores da rodada já jogaram, avalia a rodada
    if (hand.playedCardsThisRound.length >= room.players.length) {
      setTimeout(() => {
        evaluateRound(room);
      }, 1000);
    }
  });

  // 5. Chamar Truco (3, 6, 9, 12)
  socket.on('callTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;

    const hand = room.currentHand;
    if (!hand || hand.trucoState.status === 'PENDING') return;

    // Apenas quem é a vez pode pedir Truco
    if (hand.turnPlayerId !== playerId) return;

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return;

    // Não pode trucar novamente o próprio time
    if (hand.trucoState.lastTrucoTeam === player.team) return;

    const currentLevel = hand.trucoState.currentLevel;
    let nextLevel = 3;
    if (currentLevel === 3) nextLevel = 6;
    else if (currentLevel === 6) nextLevel = 9;
    else if (currentLevel === 9) nextLevel = 12;
    else if (currentLevel >= 12) return; // Já no máximo

    const targetTeam = player.team === 1 ? 2 : 1;

    hand.trucoState = {
      status: 'PENDING',
      callingPlayerId: playerId,
      callingTeam: player.team,
      targetTeam,
      currentLevel,
      pendingLevel: nextLevel,
      lastTrucoTeam: player.team
    };

    room.status = 'TRUCO_PENDING';
    hand.lastActionMsg = `🔥 ${player.name} (Time ${player.team}) pediu ${nextLevel === 3 ? 'TRUCO' : nextLevel}!`;

    broadcastRoomState(roomId);
  });

  // 6. Aceitar Truco
  socket.on('acceptTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'TRUCO_PENDING') return;

    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.trucoState.targetTeam) return;

    hand.trucoState.currentLevel = hand.trucoState.pendingLevel;
    hand.trucoState.status = 'NONE';
    hand.handValue = hand.trucoState.pendingLevel;
    room.status = 'PLAYING';

    hand.lastActionMsg = `👍 ${player.name} ACEITOU o ${hand.handValue}! O jogo vale ${hand.handValue} pontos.`;

    broadcastRoomState(roomId);
  });

  // 7. Recusar Truco / Correr
  socket.on('rejectTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'TRUCO_PENDING') return;

    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.trucoState.targetTeam) return;

    const winningTeam = hand.trucoState.callingTeam;
    const pointsAwarded = hand.trucoState.currentLevel; // Pontos do nível antes do aumento

    if (winningTeam === 1) room.scores.team1 += pointsAwarded;
    else room.scores.team2 += pointsAwarded;

    hand.lastActionMsg = `🏃 ${player.name} RECUSOU / CORREU! Time ${winningTeam} ganha ${pointsAwarded} ponto(s).`;

    // Verifica se acabou a partida
    if (room.scores.team1 >= 12 || room.scores.team2 >= 12) {
      room.status = 'GAME_OVER';
      room.winnerTeam = room.scores.team1 >= 12 ? 1 : 2;
      hand.lastActionMsg = `FIM DE JOGO! Time ${room.winnerTeam} é o campeão!`;
      broadcastRoomState(roomId);
    } else {
      setTimeout(() => {
        startNewHand(room);
        broadcastRoomState(roomId);
      }, 2500);
    }
  });

  // 8. Aumentar Truco (Re-trucar: 3->6, 6->9, 9->12)
  socket.on('raiseTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'TRUCO_PENDING') return;

    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.trucoState.targetTeam) return;

    const currentPending = hand.trucoState.pendingLevel;
    let nextLevel = 6;
    if (currentPending === 3) nextLevel = 6;
    else if (currentPending === 6) nextLevel = 9;
    else if (currentPending === 9) nextLevel = 12;
    else return;

    hand.trucoState = {
      status: 'PENDING',
      callingPlayerId: playerId,
      callingTeam: player.team,
      targetTeam: player.team === 1 ? 2 : 1,
      currentLevel: currentPending, // O novo valor base se aceito
      pendingLevel: nextLevel,
      lastTrucoTeam: player.team
    };

    hand.lastActionMsg = `🔥 ${player.name} PEDIU ${nextLevel}!`;

    broadcastRoomState(roomId);
  });

  // 9. Reconexão e Atualização de Estado
  socket.on('reconnectPlayer', ({ roomId, playerId }, callback) => {
    const room = rooms[roomId?.toUpperCase()];
    if (!room) {
      if (callback) callback({ success: false });
      return;
    }

    const player = room.players.find(p => p.playerId === playerId);
    if (player) {
      player.socketId = socket.id;
      player.connected = true;
      socket.join(room.roomId);
      if (callback) callback({ success: true, roomState: sanitizeRoomState(room, playerId) });
      broadcastRoomState(room.roomId);
    } else {
      if (callback) callback({ success: false });
    }
  });

  // 10. Sair da Sala
  socket.on('leaveRoom', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.playerId === playerId);
    if (player) {
      player.connected = false;
      broadcastRoomState(roomId);
    }
  });

  // Desconexão de socket
  socket.on('disconnect', () => {
    console.log(`Socket desconectado: ${socket.id}`);
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.connected = false;
        broadcastRoomState(roomId);
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`=== Servidor de Truco Rodando na Porta ${PORT} ===`);
});
