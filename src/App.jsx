import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Flame, EyeOff, AlertCircle, LogOut, Beer, CheckCircle, XCircle, ShieldAlert, ScrollText, Sparkles } from 'lucide-react';

import Card from './components/Card';
import Scoreboard from './components/Scoreboard';
import TrucoModal from './components/TrucoModal';
import Lobby from './components/Lobby';
import ChatBox from './components/ChatBox';
import SignalPanel from './components/SignalPanel';
import { sounds } from './utils/soundEffects';

const SOCKET_SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function App() {
  const [socket, setSocket] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isCovered, setIsCovered] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activePartnerSignal, setActivePartnerSignal] = useState(null);

  const logEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      const savedRoomId = localStorage.getItem('truco_roomId');
      const savedPlayerId = localStorage.getItem('truco_playerId');

      if (savedRoomId && savedPlayerId) {
        newSocket.emit('reconnectPlayer', { roomId: savedRoomId, playerId: savedPlayerId }, (res) => {
          if (res?.success) {
            setRoomState(res.roomState);
            const p = res.roomState.players.find(x => x.playerId === savedPlayerId);
            if (p) setCurrentPlayer(p);
            addLog('Sua conexão com a mesa caipira foi restaurada!');
          } else {
            localStorage.removeItem('truco_roomId');
            localStorage.removeItem('truco_playerId');
          }
        });
      }
    });

    newSocket.on('roomStateUpdate', (updatedState) => {
      setRoomState(updatedState);
      const savedPlayerId = localStorage.getItem('truco_playerId');
      if (savedPlayerId && updatedState) {
        const p = updatedState.players.find(x => x.playerId === savedPlayerId);
        if (p) setCurrentPlayer(p);
      }

      if (updatedState?.currentHand?.lastActionMsg) {
        addLog(updatedState.currentHand.lastActionMsg);
      }

      if (updatedState?.status === 'GAME_OVER' && updatedState.winnerTeam) {
        sounds.playWin();
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
      }
    });

    // Escutar Sinais Secretos de Parceiros
    newSocket.on('partnerSignalReceived', ({ senderPlayerId, senderName, signal }) => {
      setActivePartnerSignal({ senderPlayerId, senderName, signal });
      triggerNotification(`🤫 Sinal Secreto do parceiro (${senderName}): ${signal.emoji} ${signal.name}`);
      setTimeout(() => setActivePartnerSignal(null), 4000);
    });

    return () => newSocket.disconnect();
  }, []);

  const toggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const addLog = (msg) => {
    setLogs(prev => [...prev.slice(-40), { id: Date.now(), text: msg, time: new Date().toLocaleTimeString() }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleCreateRoom = (name, maxPlayers) => {
    if (!socket) return;
    socket.emit('createRoom', { name, maxPlayers }, (res) => {
      if (res?.success) {
        localStorage.setItem('truco_roomId', res.roomId);
        localStorage.setItem('truco_playerId', res.playerId);
        setCurrentPlayer(res.player);
        addLog(`Mesa ${res.roomId} criada com sucesso por ${name}!`);
      }
    });
  };

  const handleJoinRoom = (roomId, name) => {
    if (!socket) return;
    const existingPlayerId = localStorage.getItem('truco_playerId');
    socket.emit('joinRoom', { roomId, name, playerId: existingPlayerId }, (res) => {
      if (res?.success) {
        localStorage.setItem('truco_roomId', res.roomId);
        localStorage.setItem('truco_playerId', res.playerId);
        setCurrentPlayer(res.player);
        addLog(`${name} sentou na mesa ${res.roomId}!`);
      } else {
        alert(res?.message || 'Erro ao entrar na mesa!');
      }
    });
  };

  const handleStartGame = () => {
    if (!socket || !roomState) return;
    sounds.playDeal();
    socket.emit('startGame', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handlePlayCard = (card) => {
    if (!socket || !roomState || roomState.status !== 'PLAYING') return;

    if (roomState.currentHand?.turnPlayerId !== currentPlayer?.playerId) {
      triggerNotification('Aguarde a sua vez para bater a carta!');
      return;
    }

    sounds.playCard();
    socket.emit('playCard', { roomId: roomState.roomId, playerId: currentPlayer.playerId, cardId: card.id, hidden: isCovered });
    setIsCovered(false);
  };

  const handleCallTruco = () => {
    if (!socket || !roomState) return;
    if (roomState.currentHand?.turnPlayerId !== currentPlayer?.playerId) {
      triggerNotification('Você só pode pedir Truco na sua vez!');
      return;
    }
    sounds.playTrucoSlam();
    socket.emit('callTruco', { roomId: roomState.roomId, playerId: currentPlayer.playerId });
  };

  const handleAcceptTruco = () => {
    if (!socket || !roomState) return;
    sounds.playAccept();
    socket.emit('acceptTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handleRejectTruco = () => {
    if (!socket || !roomState) return;
    sounds.playReject();
    socket.emit('rejectTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handleRaiseTruco = () => {
    if (!socket || !roomState) return;
    sounds.playTrucoSlam();
    socket.emit('raiseTruco', { roomId: roomState.roomId, playerId: currentPlayer?.playerId });
  };

  const handleDecideMao11 = (accept) => {
    if (!socket || !roomState) return;
    if (accept) sounds.playAccept(); else sounds.playReject();
    socket.emit('decideMao11', { roomId: roomState.roomId, playerId: currentPlayer?.playerId, accept });
  };

  const handleSendSignal = (signal) => {
    if (!socket || !roomState || !currentPlayer) return;
    socket.emit('sendPartnerSignal', {
      roomId: roomState.roomId,
      playerId: currentPlayer.playerId,
      signal
    });
    triggerNotification(`Você passou o sinal: ${signal.emoji} ${signal.name}`);
  };

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
  const isMyTeamMao11Decision = roomState.status === 'MAO_11_DECISION' && hand?.mao11Team === currentPlayer?.team;
  const opponents = roomState.players.filter(p => p.team !== currentPlayer?.team);

  // Mapear avatares Caipiras
  const avatarList = [
    '/avatars/caipira1.svg',
    '/avatars/caipira2.svg',
    '/avatars/caipira1.svg',
    '/avatars/caipira2.svg'
  ];

  return (
    <div className="flex flex-col min-h-screen boteco-bg select-none overflow-hidden text-slate-100 relative">
      
      {/* PLACAR CENTRALIZADO NO TOPO */}
      <Scoreboard
        roomState={roomState}
        currentPlayer={currentPlayer}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {/* POP-UP DE NOTIFICAÇÃO */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-slate-950 px-6 py-2.5 rounded-full font-black shadow-2xl flex items-center gap-2 border-2 border-amber-300 animate-bounce">
          <AlertCircle className="w-5 h-5" />
          {notification}
        </div>
      )}

      {/* LOUSA DE REGISTRO DA PARTIDA (POSICIONADA NO TOPO ESQUERDO UM POUCO MAIS PARA BAIXO) */}
      <aside className="fixed top-24 left-3 z-30 w-64 md:w-72 lousa-boteco rounded-2xl p-3 shadow-2xl hidden md:block border-2 border-amber-800/80">
        <div className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1.5"><ScrollText className="w-3.5 h-3.5" /> Lousa de Registro</span>
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
        </div>
        <div className="h-32 overflow-y-auto space-y-1 text-[11px]">
          {logs.map(l => (
            <div key={l.id} className="text-slate-300 leading-tight">
              <span className="text-slate-500 text-[9px] font-mono mr-1">[{l.time}]</span>
              {l.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </aside>

      {/* CHAT DE TEXTO E VOZ WEBRTC (CANTO INFERIOR DIREITO) */}
      <ChatBox
        socket={socket}
        roomId={roomState.roomId}
        currentPlayer={currentPlayer}
        roomState={roomState}
      />

      {/* ÁREA PRINCIPAL DA MESA QUADRADA E PERSONAGENS CAIPIRAS */}
      <main className="flex-1 flex flex-col justify-between items-center p-2 max-w-5xl mx-auto w-full relative">
        
        {/* OPONENTES SENTADOS NA MESA (AVATARES CAIPIRAS NO NORTE DA MESA) */}
        <div className="flex justify-center items-center gap-8 pt-1 z-10">
          {opponents.map((op, opIdx) => (
            <div key={op.playerId} className="flex flex-col items-center gap-1 relative">
              
              {/* Balão de Sinal Secreto Animado */}
              {activePartnerSignal && activePartnerSignal.senderPlayerId === op.playerId && (
                <div className="absolute -top-12 z-40 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-full font-black text-xs shadow-2xl border-2 border-white signal-pop flex items-center gap-1">
                  <span className="text-base">{activePartnerSignal.signal.emoji}</span>
                  <span>{activePartnerSignal.signal.name}</span>
                </div>
              )}

              {/* Avatar do Caipira */}
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-amber-500 overflow-hidden shadow-2xl bg-amber-950 flex items-center justify-center">
                <img
                  src={avatarList[opIdx % avatarList.length]}
                  alt="Caipira"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-bold shadow ${
                hand?.turnPlayerId === op.playerId ? 'bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-400/40 animate-pulse' : 'bg-slate-900/90 text-slate-300 border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${op.connected ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                <span>{op.name}</span>
                <span className="bg-amber-950 text-amber-300 px-1 py-0.2 rounded text-[10px]">T{op.team}</span>
              </div>

              {/* Cartas do Oponente */}
              <div className="flex gap-1">
                {Array.from({ length: op.cardCount || 0 }).map((_, i) => (
                  <Card key={i} card={{ id: 'BACK', hidden: true }} isSmall disabled />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ESTRUTURA DA MESA QUADRADA DE TRUCO (FELTRO VERMELHO COM NAIPES + 4 PORTA-COPOS) */}
        <div className="my-auto relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] square-table-truco suits-pattern-bg flex flex-col items-center justify-center p-4">
          
          {/* PORTA-COPOS NOS 4 CANTOS DA MESA QUADRADA (COMO NA IMAGEM) */}
          <div className="absolute top-2 left-2 cup-holder flex items-center justify-center text-[10px] text-amber-500/40">🍺</div>
          <div className="absolute top-2 right-2 cup-holder flex items-center justify-center text-[10px] text-amber-500/40">🍺</div>
          <div className="absolute bottom-2 left-2 cup-holder flex items-center justify-center text-[10px] text-amber-500/40">🍺</div>
          <div className="absolute bottom-2 right-2 cup-holder flex items-center justify-center text-[10px] text-amber-500/40">🍺</div>

          {/* ADESIVO DO PATROCINADOR (MARIA LANCHES) COLADO NA MESA */}
          <div 
            onClick={() => triggerNotification('🍔 Maria Lanches: O melhor lanche do Boteco!')}
            className="absolute -top-6 -right-6 md:-top-7 md:-right-7 z-30 sponsor-sticker p-1.5 cursor-pointer flex flex-col items-center select-none"
            title="Patrocinador Oficial: Maria Lanches"
          >
            <img 
              src="/marialanches.png" 
              alt="Maria Lanches" 
              className="w-14 h-14 md:w-20 md:h-20 object-contain rounded-lg shadow-inner"
            />
            <span className="text-[8px] md:text-[9px] font-black text-slate-950 uppercase tracking-tighter mt-1 bg-amber-400 px-1 py-0.5 rounded border border-amber-600 shadow-sm">
              PATROCINADOR
            </span>
          </div>

          {/* VIRA E MANILHA */}
          <div className="flex items-center gap-3 bg-slate-950/90 p-2 rounded-2xl border border-amber-500/50 shadow-2xl z-10 mb-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-wider uppercase">VIRA</span>
              <Card card={hand?.vira} isVira isSmall disabled />
            </div>
            <div className="h-12 w-px bg-slate-800"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">MANILHA</span>
              <div className="bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-lg text-base shadow-lg border border-amber-300">
                {hand?.manilha}
              </div>
            </div>
          </div>

          {/* CARTAS JOGADAS NO CENTRO DA MESA QUADRADA */}
          <div className="flex items-center justify-center gap-3 min-h-[110px] w-full z-10">
            {hand?.playedCardsThisRound && hand.playedCardsThisRound.length > 0 ? (
              hand.playedCardsThisRound.map((pc, idx) => {
                const playerObj = roomState.players.find(p => p.playerId === pc.playerId);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1 animate-deal-card">
                    <span className="text-[10px] font-bold text-slate-200 bg-slate-950/90 px-2 py-0.5 rounded-full border border-amber-500/40 shadow">
                      {playerObj?.name || 'Jogador'}
                    </span>
                    <Card card={pc.card} disabled />
                  </div>
                );
              })
            ) : (
              <div className="text-amber-100/70 text-xs font-mono font-bold uppercase tracking-widest bg-slate-950/50 border border-dashed border-amber-500/40 px-5 py-6 rounded-2xl backdrop-blur-sm">
                Mesa Quadrada Limpa • Bate a carta!
              </div>
            )}
          </div>

          {/* TURNO ATUAL NO CENTRO */}
          <div className={`mt-2 px-4 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-2 shadow-xl z-10 transition-all ${
            isMyTurn ? 'bg-amber-400 text-slate-950 animate-bounce' : 'bg-slate-950 text-slate-400 border border-slate-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-slate-950' : 'bg-slate-500'}`}></span>
            {isMyTurn ? 'SUA VEZ DE BATER!' : `Vez de ${roomState.players.find(p => p.playerId === hand?.turnPlayerId)?.name || 'outro'}`}
          </div>

        </div>

        {/* ÁREA DO JOGADOR LOCAL (SUL DA MESA COM SEU AVATAR CAIPIRA E CARTAS) */}
        <div className="flex flex-col items-center gap-2 pb-1 z-10 w-full">
          
          {/* PAINEL DE SINAIS SECRETOS DE DUPLA */}
          <div className="flex items-center gap-2 mb-1">
            <SignalPanel
              onSendSignal={handleSendSignal}
              disabled={roomState.status !== 'PLAYING'}
            />
          </div>

          {/* BOTÕES DE AÇÃO (TRUCO / COBERTA / SAIR) */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCallTruco}
              disabled={!isMyTurn || roomState.status !== 'PLAYING' || hand?.isMao11}
              className={`px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-xl ${
                isMyTurn && roomState.status === 'PLAYING' && !hand?.isMao11
                  ? 'bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 hover:brightness-110 text-slate-950 shadow-amber-950/80 active:scale-95 cursor-pointer border border-amber-300 glow-gold'
                  : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4 fill-slate-950" />
              GRITAR TRUCO!
            </button>

            <button
              onClick={() => setIsCovered(!isCovered)}
              disabled={!isMyTurn}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                isCovered ? 'bg-indigo-700 text-white border-indigo-400 shadow-lg' : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              {isCovered ? 'JOGAR NO ESCURO: SIM' : 'CARTA COBERTA'}
            </button>

            <button
              onClick={handleLeaveRoom}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-400 hover:text-red-400 bg-slate-950/80 border border-slate-800 hover:border-red-900/60 transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>

          {/* SUAS CARTAS NA MÃO COM SEU AVATAR CAIPIRA AO LADO */}
          <div className="flex items-center justify-center gap-4 min-h-[110px]">
            {/* Seu Avatar Caipira */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-amber-400 overflow-hidden shadow-xl bg-amber-950">
                <img
                  src="/avatars/caipira1.svg"
                  alt="Seu Avatar Caipira"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded-full border border-amber-500/40">
                {currentPlayer?.name} (Você)
              </span>
            </div>

            {/* Cartas na mão */}
            <div className="flex items-center justify-center gap-2 md:gap-4">
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

        </div>

      </main>

      {/* MODAL DE DECISÃO DA MÃO DE 11 */}
      {isMyTeamMao11Decision && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-4 border-amber-500 rounded-3xl p-6 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-full text-xl inline-flex items-center gap-2">
              <ShieldAlert className="w-6 h-6" /> MÃO DE 11!
            </div>
            <p className="text-slate-300 text-sm">
              Seu time chegou a 11 pontos! Vocês podem ver as cartas um do outro. Decidam se vão <span className="font-bold text-amber-400">JOGAR A MÃO (3 Pontos)</span> ou <span className="font-bold text-red-400">CORRER (Concede 1 Ponto)</span>.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDecideMao11(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-base shadow-lg"
              >
                <CheckCircle className="w-5 h-5" /> JOGAR MÃO DE 11 (Vale 3 Pts)
              </button>
              <button
                onClick={() => handleDecideMao11(false)}
                className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-base shadow-lg"
              >
                <XCircle className="w-5 h-5" /> CORRER DA MÃO DE 11 (Concede 1 Pt)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRUCO */}
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
