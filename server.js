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

// Baralho de 40 Cartas (Truco Paulista/Mineiro)
const SUITS = [
  { symbol: '♣', name: 'Paus', rank: 4 },     // Zap
  { symbol: '♥', name: 'Copas', rank: 3 },    // Copas
  { symbol: '♠', name: 'Espadas', rank: 2 },  // Espadilha
  { symbol: '♦', name: 'Ouros', rank: 1 }     // Pica-fumo
];

const VALUES_ORDER = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function getManilhaValue(viraValue) {
  const index = VALUES_ORDER.indexOf(viraValue);
  if (index === -1) return '4';
  return VALUES_ORDER[(index + 1) % VALUES_ORDER.length];
}

function getCardStrength(card, viraValue, isHidden) {
  if (!card || isHidden) return -999; // Carta coberta perde para qualquer carta normal
  const manilhaValue = getManilhaValue(viraValue);
  
  if (card.value === manilhaValue) {
    const suitObj = SUITS.find(s => s.symbol === card.suit);
    const suitRank = suitObj ? suitObj.rank : 0;
    return 1000 + suitRank;
  }
  return VALUES_ORDER.indexOf(card.value);
}

function compareCards(pcA, pcB, viraValue) {
  const strengthA = getCardStrength(pcA.card, viraValue, pcA.hidden);
  const strengthB = getCardStrength(pcB.card, viraValue, pcB.hidden);
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

const rooms = {};

function sanitizeRoomState(room, requestingPlayerId) {
  if (!room) return null;

  const requestingPlayer = room.players.find(p => p.playerId === requestingPlayerId);
  const isMao11 = room.currentHand?.isMao11;
  const isMaoFerro = room.currentHand?.isMaoFerro;

  const sanitizedPlayers = room.players.map(p => {
    const isSelf = p.playerId === requestingPlayerId;
    const isPartner = requestingPlayer && p.team === requestingPlayer.team;
    
    // Na Mão de 11, parceiros de time enxergam as cartas um do outro!
    const canSeeHand = isSelf || (isMao11 && isPartner && !isMaoFerro);

    return {
      playerId: p.playerId,
      name: p.name,
      team: p.team,
      connected: p.connected,
      cardCount: p.hand ? p.hand.length : 0,
      hand: canSeeHand ? p.hand : p.hand ? p.hand.map(() => ({ id: 'BACK', hidden: true })) : []
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
      isMao11: room.currentHand.isMao11,
      isMaoFerro: room.currentHand.isMaoFerro,
      mao11Team: room.currentHand.mao11Team,
      mao11Decision: room.currentHand.mao11Decision,
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

  let cardIdx = 0;
  room.players.forEach(p => {
    p.hand = [deck[cardIdx++], deck[cardIdx++], deck[cardIdx++]];
  });

  const vira = deck[cardIdx++];
  const manilha = getManilhaValue(vira.value);

  const starterIndex = (room.starterPlayerIndex ?? -1) + 1;
  const actualStarterIdx = starterIndex % room.players.length;
  room.starterPlayerIndex = actualStarterIdx;
  const starterPlayer = room.players[actualStarterIdx];

  // Verificar Mão de 11 e Mão de Ferro
  const t1 = room.scores.team1;
  const t2 = room.scores.team2;
  const isMao11 = t1 === 11 || t2 === 11;
  const isMaoFerro = t1 === 11 && t2 === 11;
  const mao11Team = isMaoFerro ? 'BOTH' : t1 === 11 ? 1 : t2 === 11 ? 2 : null;

  room.status = (isMao11 && !isMaoFerro) ? 'MAO_11_DECISION' : 'PLAYING';

  let initialMsg = `🍺 Nova mão iniciada! Vira: ${vira.value}${vira.suit}. Vez de ${starterPlayer.name}`;
  if (isMaoFerro) initialMsg = `⚡ MÃO DE FERRO (11 x 11)! Partida jogada no escuro!`;
  else if (isMao11) initialMsg = `⚠️ MÃO DE 11 para o Time ${mao11Team}! Decidam se jogam por 3 pontos ou correm.`;

  room.currentHand = {
    seed,
    vira,
    manilha,
    handValue: isMao11 ? 3 : 1,
    currentRoundIndex: 0,
    turnPlayerId: starterPlayer.playerId,
    roundStarterPlayerId: starterPlayer.playerId,
    playedCardsThisRound: [],
    rounds: [],
    handWinners: { team1Wins: 0, team2Wins: 0 },
    isMao11,
    isMaoFerro,
    mao11Team,
    mao11Decision: isMao11 && !isMaoFerro ? 'PENDING' : 'ACCEPTED',
    trucoState: {
      status: 'NONE',
      callingPlayerId: null,
      callingTeam: null,
      targetTeam: null,
      currentLevel: isMao11 ? 3 : 1,
      pendingLevel: 3,
      lastTrucoTeam: null
    },
    lastActionMsg: initialMsg
  };
}

function checkHandWinner(room) {
  const hand = room.currentHand;
  const rounds = hand.rounds;

  let team1Wins = 0;
  let team2Wins = 0;

  rounds.forEach(r => {
    if (r.winnerTeam === 1) team1Wins++;
    else if (r.winnerTeam === 2) team2Wins++;
  });

  hand.handWinners = { team1Wins, team2Wins };
  let winningTeam = null;

  if (team1Wins >= 2) winningTeam = 1;
  else if (team2Wins >= 2) winningTeam = 2;
  else if (rounds.length === 3) {
    if (team1Wins > team2Wins) winningTeam = 1;
    else if (team2Wins > team1Wins) winningTeam = 2;
  }

  // Regras de Canga (Empate nas rodadas)
  if (!winningTeam) {
    if (rounds.length === 2) {
      if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam !== 'TIE') winningTeam = rounds[1].winnerTeam;
      else if (rounds[0].winnerTeam !== 'TIE' && rounds[1].winnerTeam === 'TIE') winningTeam = rounds[0].winnerTeam;
    } else if (rounds.length === 3) {
      if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam === 'TIE' && rounds[2].winnerTeam !== 'TIE') winningTeam = rounds[2].winnerTeam;
      else if (rounds[0].winnerTeam === 'TIE' && rounds[1].winnerTeam === 'TIE' && rounds[2].winnerTeam === 'TIE') {
        hand.lastActionMsg = 'Empate triplo! Ninguém pontua.';
        setTimeout(() => { startNewHand(room); broadcastRoomState(room.roomId); }, 2500);
        return;
      }
    }
  }

  if (winningTeam) {
    const pointsAwarded = hand.handValue;
    if (winningTeam === 1) room.scores.team1 += pointsAwarded;
    else room.scores.team2 += pointsAwarded;

    hand.lastActionMsg = `🎉 Time ${winningTeam} venceu a mão e ganhou ${pointsAwarded} ponto(s)!`;

    if (room.scores.team1 >= 12 || room.scores.team2 >= 12) {
      room.status = 'GAME_OVER';
      room.winnerTeam = room.scores.team1 >= 12 ? 1 : 2;
      hand.lastActionMsg = `🏆 FIM DE JOGO! Time ${room.winnerTeam} é o campeão do Boteco!`;
      broadcastRoomState(room.roomId);
    } else {
      setTimeout(() => { startNewHand(room); broadcastRoomState(room.roomId); }, 3000);
    }
  } else {
    hand.currentRoundIndex++;
    hand.playedCardsThisRound = [];
    broadcastRoomState(room.roomId);
  }
}

function evaluateRound(room) {
  const hand = room.currentHand;
  const played = hand.playedCardsThisRound;
  if (played.length < room.players.length) return;

  let highestPlayed = null;
  let roundWinnerPlayerId = null;
  let isTie = false;

  played.forEach(p => {
    if (!highestPlayed) {
      highestPlayed = p;
      roundWinnerPlayerId = p.playerId;
    } else {
      const cmp = compareCards(p, highestPlayed, hand.vira.value);
      if (cmp > 0) {
        highestPlayed = p;
        roundWinnerPlayerId = p.playerId;
        isTie = false;
      } else if (cmp === 0) {
        isTie = true;
      }
    }
  });

  const winnerPlayer = room.players.find(p => p.playerId === roundWinnerPlayerId);
  const winnerTeam = isTie ? 'TIE' : winnerPlayer.team;

  hand.rounds.push({ winnerTeam, winnerPlayerId: isTie ? null : roundWinnerPlayerId, cardsPlayed: [...played] });

  if (isTie) {
    hand.lastActionMsg = `🤝 Rodada ${hand.currentRoundIndex + 1} EMPATOU!`;
  } else {
    hand.lastActionMsg = `💥 ${winnerPlayer.name} (Time ${winnerTeam}) levou a ${hand.currentRoundIndex + 1}ª rodada!`;
    hand.turnPlayerId = roundWinnerPlayerId;
  }

  checkHandWinner(room);
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, maxPlayers = 2 }, callback) => {
    const roomId = generateRoomCode();
    const playerId = `p_${Math.random().toString(36).substring(2, 9)}`;

    const player = { id: socket.id, playerId, name: name || 'Jogador 1', socketId: socket.id, team: 1, connected: true, hand: [] };
    rooms[roomId] = { roomId, maxPlayers: Number(maxPlayers) || 2, players: [player], status: 'LOBBY', scores: { team1: 0, team2: 0 }, starterPlayerIndex: 0 };

    socket.join(roomId);
    if (callback) callback({ success: true, roomId, playerId, player });
    broadcastRoomState(roomId);
  });

  socket.on('joinRoom', ({ roomId, name, playerId }, callback) => {
    const room = rooms[roomId?.toUpperCase()];
    if (!room) { if (callback) callback({ success: false, message: 'Sala não encontrada!' }); return; }

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
    const team = (room.players.length % 2) + 1;
    const player = { id: socket.id, playerId: newPlayerId, name: name || `Jogador ${room.players.length + 1}`, socketId: socket.id, team, connected: true, hand: [] };

    room.players.push(player);
    socket.join(room.roomId);
    if (callback) callback({ success: true, roomId: room.roomId, playerId: newPlayerId, player });
    broadcastRoomState(room.roomId);
  });

  socket.on('startGame', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;
    startNewHand(room);
    broadcastRoomState(roomId);
  });

  // Decisão Mão de 11 (Jogar por 3 pts ou Correr perdendo 1 pt)
  socket.on('decideMao11', ({ roomId, playerId, accept }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'MAO_11_DECISION') return;
    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.mao11Team) return;

    if (accept) {
      room.status = 'PLAYING';
      hand.mao11Decision = 'ACCEPTED';
      hand.lastActionMsg = `👍 Time ${player.team} aceitou a MÃO DE 11! A mão vale 3 pontos.`;
      broadcastRoomState(roomId);
    } else {
      // Correr na mão de 11 concede 1 ponto ao oponente
      const opposingTeam = player.team === 1 ? 2 : 1;
      if (opposingTeam === 1) room.scores.team1 += 1;
      else room.scores.team2 += 1;

      hand.lastActionMsg = `🏃 Time ${player.team} fugiu da Mão de 11! Time ${opposingTeam} ganha 1 ponto.`;

      if (room.scores.team1 >= 12 || room.scores.team2 >= 12) {
        room.status = 'GAME_OVER';
        room.winnerTeam = room.scores.team1 >= 12 ? 1 : 2;
        hand.lastActionMsg = `🏆 FIM DE JOGO! Time ${room.winnerTeam} é o campeão do Boteco!`;
        broadcastRoomState(roomId);
      } else {
        setTimeout(() => { startNewHand(room); broadcastRoomState(roomId); }, 2500);
      }
    }
  });

  socket.on('playCard', ({ roomId, playerId, cardId, hidden = false }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;

    const hand = room.currentHand;
    if (!hand || hand.turnPlayerId !== playerId) return;

    const player = room.players.find(p => p.playerId === playerId);
    if (!player) return;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const [playedCard] = player.hand.splice(cardIndex, 1);
    const isActuallyHidden = hidden || hand.isMaoFerro;

    hand.playedCardsThisRound.push({ playerId, team: player.team, card: playedCard, hidden: isActuallyHidden });
    hand.lastActionMsg = `${player.name} bateu ${isActuallyHidden ? 'uma carta coberta' : `${playedCard.value}${playedCard.suit}`}`;

    const currentIdx = room.players.findIndex(p => p.playerId === playerId);
    hand.turnPlayerId = room.players[(currentIdx + 1) % room.players.length].playerId;

    broadcastRoomState(roomId);

    if (hand.playedCardsThisRound.length >= room.players.length) {
      setTimeout(() => evaluateRound(room), 1000);
    }
  });

  socket.on('callTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'PLAYING') return;
    const hand = room.currentHand;
    if (!hand || hand.isMao11 || hand.turnPlayerId !== playerId || hand.trucoState.status === 'PENDING') return; // Truco bloqueado na Mão de 11

    const player = room.players.find(p => p.playerId === playerId);
    if (!player || hand.trucoState.lastTrucoTeam === player.team) return;

    const currentLevel = hand.trucoState.currentLevel;
    let nextLevel = currentLevel === 1 ? 3 : currentLevel === 3 ? 6 : currentLevel === 6 ? 9 : 12;
    const targetTeam = player.team === 1 ? 2 : 1;

    hand.trucoState = { status: 'PENDING', callingPlayerId: playerId, callingTeam: player.team, targetTeam, currentLevel, pendingLevel: nextLevel, lastTrucoTeam: player.team };
    room.status = 'TRUCO_PENDING';
    hand.lastActionMsg = `🔥 ${player.name} (Time ${player.team}) gritou ${nextLevel === 3 ? 'TRUCO!' : `${nextLevel}!`}`;

    broadcastRoomState(roomId);
  });

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
    hand.lastActionMsg = `👍 ${player.name} ACEITOU! A mão agora vale ${hand.handValue} pontos.`;

    broadcastRoomState(roomId);
  });

  socket.on('rejectTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'TRUCO_PENDING') return;

    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.trucoState.targetTeam) return;

    const winningTeam = hand.trucoState.callingTeam;
    const pointsAwarded = hand.trucoState.currentLevel;

    if (winningTeam === 1) room.scores.team1 += pointsAwarded;
    else room.scores.team2 += pointsAwarded;

    hand.lastActionMsg = `🏃 ${player.name} CORREU! Time ${winningTeam} leva ${pointsAwarded} ponto(s).`;

    if (room.scores.team1 >= 12 || room.scores.team2 >= 12) {
      room.status = 'GAME_OVER';
      room.winnerTeam = room.scores.team1 >= 12 ? 1 : 2;
      hand.lastActionMsg = `🏆 FIM DE JOGO! Time ${room.winnerTeam} é o campeão do Boteco!`;
      broadcastRoomState(room.roomId);
    } else {
      setTimeout(() => { startNewHand(room); broadcastRoomState(room.roomId); }, 2500);
    }
  });

  socket.on('raiseTruco', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room || room.status !== 'TRUCO_PENDING') return;

    const hand = room.currentHand;
    const player = room.players.find(p => p.playerId === playerId);
    if (!player || player.team !== hand.trucoState.targetTeam) return;

    const currentPending = hand.trucoState.pendingLevel;
    let nextLevel = currentPending === 3 ? 6 : currentPending === 6 ? 9 : 12;

    hand.trucoState = { status: 'PENDING', callingPlayerId: playerId, callingTeam: player.team, targetTeam: player.team === 1 ? 2 : 1, currentLevel: currentPending, pendingLevel: nextLevel, lastTrucoTeam: player.team };
    hand.lastActionMsg = `🔥 ${player.name} RETRCOU E PEDIU ${nextLevel}!`;

    broadcastRoomState(roomId);
  });

  socket.on('reconnectPlayer', ({ roomId, playerId }, callback) => {
    const room = rooms[roomId?.toUpperCase()];
    if (!room) { if (callback) callback({ success: false }); return; }

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

  socket.on('leaveRoom', ({ roomId, playerId }) => {
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(p => p.playerId === playerId);
    if (player) { player.connected = false; broadcastRoomState(roomId); }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) { player.connected = false; broadcastRoomState(roomId); }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`=== Servidor de Truco de Boteco Rodando na Porta ${PORT} ===`);
});
