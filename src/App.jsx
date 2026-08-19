import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Flame, RefreshCw, EyeOff, Shield, Trophy, AlertCircle, LogOut } from 'lucide-react';

import Card from './components/Card';
import Scoreboard from './components/Scoreboard';
import TrucoModal from './components/TrucoModal';
import Lobby from './components/Lobby';

const SOCKET_SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isCovered, setIsCovered] = useState(false);
  const [notification, setNotification] = useState(null);

  const logEndRef = useRef(null);

  // Inicializar Socket.IO e Reconexão via localStorage
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado ao servidor de Truco via Socket.IO');

      // Tentar reconexão automática se houver dados em localStorage
      const savedRoomId = localStorage.getItem('truco_roomId');
      const savedPlayerId = localStorage.getItem('truco_playerId');

      if (savedRoomId && savedPlayerId) {
        newSocket.emit('reconnectPlayer', { roomId: savedRoomId, playerId: savedPlayerId }, (res) => {
          if (res?.success) {
            setRoomState(res.roomState);
            const p = res.roomState.players.find(x => x.playerId === savedPlayerId);
            if (p) setCurrentPlayer(p);
            addLog('Sua conexão com a sala foi restaurada!');
          } else {
            // Limpa chave obsoleta
            localStorage.removeItem('truco_roomId');
            localStorage.removeItem('truco_playerId');
          }
        });
      }
    });

    newSocket.on('roomStateUpdate', (updatedState) => {
      setRoomState(updatedState);

      // Atualizar objeto do jogador atual
      const savedPlayerId = localStorage.getItem('truco_playerId');
      if (savedPlayerId && updatedState) {
        const p = updatedState.players.find(x => x.playerId === savedPlayerId);
        if (p) setCurrentPlayer(p);
      }

      if (updatedState?.currentHand?.lastActionMsg) {
        addLog(updatedState.currentHand.lastActionMsg);
      }

      // Ativar Confetes no Fim do Jogo
      if (updatedState?.status === 'GAME_OVER' && updatedState.winnerTeam) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addLog = (msg) => {
    setLogs(prev => [...prev.slice(-40), { id: Date.now(), text: msg, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Criar Sala
  const handleCreateRoom = (name, maxPlayers) => {
    if (!socket) return;
    socket.emit('createRoom', { name, maxPlayers }, (res) => {
      if (res?.success) {
        localStorage.setItem('truco_roomId', res.roomId);
        localStorage.setItem('truco_playerId', res.playerId);
        setCurrentPlayer(res.player);
        addLog(`Sala ${res.roomId} criada com sucesso por ${name}!`);
      }
    });
  };

  // Entrar na Sala
  const handleJoinRoom = (roomId, name) => {
    if (!socket) return;
    const existingPlayerId = localStorage.getItem('truco_playerId');
    socket.emit('joinRoom', { roomId, name, playerId: existingPlayerId }, (res) => {
      if (res?.success) {
        localStorage.setItem('truco_roomId', res.roomId);
        localStorage.setItem('truco_playerId', res.playerId);
        setCurrentPlayer(res.player);
        addLog(`${name} entrou na sala ${res.roomId}!`);
      } else {
        alert(res?.message || 'Erro ao entrar na sala!');
      }
    });
  };

  // Iniciar Jogo
  const handleStartGame = () => {
    if (!socket || !roomState) return;
    socket.emit('startGame', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  // Jogar Carta
  const handlePlayCard = (card) => {
    if (!socket || !roomState || roomState.status !== 'PLAYING') return;

    const currentTurnId = roomState.currentHand?.turnPlayerId;
    if (currentTurnId !== currentPlayer?.playerId) {
      triggerNotification('Aguarde a sua vez para jogar!');
      return;
    }

    socket.emit('playCard', {
      roomId: roomState.roomId,
      playerId: currentPlayer.playerId,
      cardId: card.id,
      hidden: isCovered
    });

    setIsCovered(false); // Reseta estado de carta coberta
  };

  // Pedir Truco
  const handleCallTruco = () => {
    if (!socket || !roomState) return;

    const currentTurnId = roomState.currentHand?.turnPlayerId;
    if (currentTurnId !== currentPlayer?.playerId) {
      triggerNotification('Você só pode pedir Truco na sua vez!');
      return;
    }

    socket.emit('callTruco', {
      roomId: roomState.roomId,
      playerId: currentPlayer.playerId
    });
  };

  // Resposta do Truco
  const handleAcceptTruco = () => {
    if (!socket || !roomState) return;
    socket.emit('acceptTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handleRejectTruco = () => {
    if (!socket || !roomState) return;
    socket.emit('rejectTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handleRaiseTruco = () => {
    if (!socket || !roomState) return;
    socket.emit('raiseTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  // Sair da Sala
  const handleLeaveRoom = () => {
    if (socket && roomState) {
      socket.emit('leaveRoom', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
    }
    localStorage.removeItem('truco_roomId');
    localStorage.removeItem('truco_playerId');
    setRoomState(null);
    setCurrentPlayer(null);
  };

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // Renderizar o Lobby se não estiver em jogo
  if (!roomState || roomState.status === 'LOBBY') {
    return (
      <Lobby
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onStartGame={handleStartGame}
        roomState={roomState}
        currentPlayer={currentPlayer}
      />
    );
  }

  const hand = roomState.currentHand;
  const isMyTurn = hand?.turnPlayerId === currentPlayer?.playerId;
  const isTargetTeamForTruco = hand?.trucoState?.targetTeam === currentPlayer?.team;

  // Encontrar oponentes e parceiros
  const opponents = roomState.players.filter(p => p.team !== currentPlayer?.team);
  const partners = roomState.players.filter(p => p.team === currentPlayer?.team && p.playerId !== currentPlayer?.playerId);

  return (
    <div className="flex flex-col min-h-screen bg-table-dark felt-texture select-none overflow-hidden">
      
      {/* Placar e Barra de Informações Superior */}
      <Scoreboard roomState={roomState} currentPlayer={currentPlayer} />

      {/* Pop-up de Notificação temporária */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-6 py-2 rounded-full font-black shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle className="w-5 h-5" />
          {notification}
        </div>
      )}

      {/* ÁREA DA MESA PRINCIPAL */}
      <main className="flex-1 flex flex-col justify-between p-4 max-w-6xl mx-auto w-full relative">
        
        {/* OPONENTES (TOPO DA MESA) */}
        <div className="flex justify-center items-center gap-6 pt-2">
          {opponents.map(op => (
            <div key={op.playerId} className="flex flex-col items-center gap-1">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${
                hand?.turnPlayerId === op.playerId ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/40 animate-pulse' : 'bg-slate-900/80 text-slate-300 border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${op.connected ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                <span>{op.name}</span>
                <span className="bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded text-[10px]">Time {op.team}</span>
              </div>

              {/* Cartas do Oponente (Ocultas) */}
              <div className="flex gap-1">
                {Array.from({ length: op.cardCount || 0 }).map((_, i) => (
                  <Card key={i} card={{ id: 'BACK', hidden: true }} isSmall disabled />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CENTRO DA MESA: VIRA + CARTAS JOGADAS NA RODADA */}
        <div className="my-auto flex flex-col items-center justify-center gap-4 relative py-6">
          
          {/* Vira e Monte */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-2xl border border-emerald-800/40 shadow-2xl">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-amber-400 font-bold tracking-wider uppercase mb-1">VIRA</span>
              <Card card={hand?.vira} isVira disabled />
            </div>

            <div className="h-20 w-px bg-slate-800"></div>

            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">MANILHA</span>
              <div className="bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xl shadow-lg border border-amber-300">
                {hand?.manilha}
              </div>
            </div>
          </div>

          {/* Cartas Jogadas na Rodada Atual */}
          <div className="min-h-[140px] flex items-center justify-center gap-4 w-full px-4">
            {hand?.playedCardsThisRound && hand.playedCardsThisRound.length > 0 ? (
              hand.playedCardsThisRound.map((pc, idx) => {
                const playerObj = roomState.players.find(p => p.playerId === pc.playerId);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 animate-card-play">
                    <span className="text-[11px] font-bold text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-700">
                      {playerObj?.name || 'Jogador'}
                    </span>
                    <Card card={pc.card} disabled />
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500/70 text-xs font-semibold uppercase tracking-widest border border-dashed border-slate-700/50 px-6 py-8 rounded-xl">
                Aguardando cartas serem jogadas...
              </div>
            )}
          </div>

          {/* Indicador de Turno no Centro */}
          <div className={`px-5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-lg transition-all ${
            isMyTurn ? 'bg-emerald-500 text-slate-950 animate-bounce' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-slate-950' : 'bg-slate-500'}`}></span>
            {isMyTurn ? 'SUA VEZ DE JOGAR!' : `Vez de ${roomState.players.find(p => p.playerId === hand?.turnPlayerId)?.name || 'outro jogador'}`}
          </div>

        </div>

        {/* ÁREA INFERIOR: SUA MÃO + BOTÕES DE AÇÃO */}
        <div className="flex flex-col items-center gap-4 pb-2">
          
          {/* Ações (Truco, Carta Coberta, Sair) */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCallTruco}
              disabled={!isMyTurn || roomState.status !== 'PLAYING'}
              className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
                isMyTurn && roomState.status === 'PLAYING'
                  ? 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 shadow-amber-900/60 active:scale-95 cursor-pointer glow-gold'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4 fill-slate-950" />
              PEDIR TRUCO
            </button>

            <button
              onClick={() => setIsCovered(!isCovered)}
              disabled={!isMyTurn}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                isCovered
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg'
                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              {isCovered ? 'CARTA COBERTA: ATIVADA' : 'JOGAR COBERTA'}
            </button>

            <button
              onClick={handleLeaveRoom}
              className="px-3 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-red-400 bg-slate-900/60 border border-slate-800 hover:border-red-900/60 transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>

          {/* Suas Cartas na Mão */}
          <div className="flex items-center justify-center gap-3 md:gap-6 min-h-[120px]">
            {currentPlayer?.hand && currentPlayer.hand.length > 0 ? (
              currentPlayer.hand.map((card, idx) => (
                <Card
                  key={card.id || idx}
                  card={card}
                  onClick={() => handlePlayCard(card)}
                  disabled={!isMyTurn || roomState.status !== 'PLAYING'}
                  isManilha={card.value === hand?.manilha}
                />
              ))
            ) : (
              <div className="text-slate-500 text-xs font-semibold">Sem cartas na mão</div>
            )}
          </div>

        </div>

      </main>

      {/* HISTÓRICO DE MENSAGENS / LOG DA SALA (RODAPÉ DIREITO) */}
      <aside className="fixed bottom-3 right-3 z-30 w-72 md:w-80 bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md hidden sm:block">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between border-b border-slate-800 pb-1">
          <span>Histórico da Partida</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
        <div className="h-28 overflow-y-auto space-y-1 text-xs">
          {logs.map(l => (
            <div key={l.id} className="text-slate-300 leading-tight">
              <span className="text-slate-500 text-[10px] mr-1">[{l.time}]</span>
              {l.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </aside>

      {/* MODAL DE TRUCO (ACEITAR / RECUSAR / AUMENTAR) */}
      <TrucoModal
        trucoState={hand?.trucoState}
        onAccept={handleAcceptTruco}
        onReject={handleRejectTruco}
        onRaise={handleRaiseTruco}
        isTargetTeam={isTargetTeamForTruco}
      />

    </div>
  );
}
