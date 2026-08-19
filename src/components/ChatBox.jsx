import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Mic, MicOff, Volume2, Radio } from 'lucide-react';

export default function ChatBox({ socket, roomId, currentPlayer, roomState }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);

  const chatEndRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  // 1. Escutar Mensagens de Chat de Texto via Socket
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (msg) => {
      setMessages(prev => [...prev.slice(-30), msg]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    socket.on('chatMessage', handleChatMessage);

    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket]);

  // 2. WebRTC Sinalização para Chat de Voz
  useEffect(() => {
    if (!socket) return;

    const handleVoiceOffer = async ({ offer, senderSocketId, senderPlayerId }) => {
      if (!isMicOn) return;
      try {
        const pc = createPeerConnection(senderSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voiceAnswer', { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.error('Erro no voiceOffer WebRTC:', err);
      }
    };

    const handleVoiceAnswer = async ({ answer, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Erro no voiceAnswer WebRTC:', err);
        }
      }
    };

    const handleVoiceCandidate = async ({ candidate, senderSocketId }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Erro no voiceCandidate WebRTC:', err);
        }
      }
    };

    socket.on('voiceOffer', handleVoiceOffer);
    socket.on('voiceAnswer', handleVoiceAnswer);
    socket.on('voiceCandidate', handleVoiceCandidate);

    return () => {
      socket.off('voiceOffer', handleVoiceOffer);
      socket.off('voiceAnswer', handleVoiceAnswer);
      socket.off('voiceCandidate', handleVoiceCandidate);
    };
  }, [socket, isMicOn]);

  const createPeerConnection = (targetSocketId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voiceCandidate', { targetSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.autoplay = true;
    };

    peerConnectionsRef.current[targetSocketId] = pc;
    return pc;
  };

  // Alternar Microfone (Ligar / Desligar Chat de Voz)
  const toggleVoiceChat = async () => {
    if (isMicOn) {
      // Desligar Microfone e fechar conexões
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      setIsMicOn(false);
    } else {
      // Solicitar Acesso ao Microfone do Navegador
      setVoiceConnecting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        setIsMicOn(true);
        setVoiceConnecting(false);

        // Estabelecer conexões WebRTC com todos os outros jogadores da sala
        const otherPlayers = roomState?.players.filter(p => p.playerId !== currentPlayer?.playerId && p.socketId) || [];
        for (const p of otherPlayers) {
          const pc = createPeerConnection(p.socketId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('voiceOffer', { targetSocketId: p.socketId, offer, senderPlayerId: currentPlayer?.playerId });
        }
      } catch (err) {
        setVoiceConnecting(false);
        alert('Permissão de microfone negada ou indisponível no dispositivo.');
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !roomId) return;

    socket.emit('sendChatMessage', {
      roomId,
      playerId: currentPlayer?.playerId,
      text: inputText
    });

    setInputText('');
  };

  return (
    <aside className="fixed bottom-3 right-3 z-30 w-72 md:w-80 lousa-boteco rounded-2xl p-3 shadow-2xl flex flex-col justify-between h-56 border-2 border-amber-800/80">
      
      {/* Cabeçalho do Chat & Controles de Voz */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span>Bate-Papo da Mesa</span>
        </div>

        {/* Botão de Chat de Voz WebRTC */}
        <button
          onClick={toggleVoiceChat}
          disabled={voiceConnecting}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow ${
            isMicOn
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40'
          }`}
          title={isMicOn ? 'Desligar Microfone de Voz' : 'Ligar Chat de Voz da Mesa'}
        >
          {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isMicOn ? 'Voz On' : 'Voz Off'}</span>
        </button>
      </div>

      {/* Lista de Mensagens do Chat */}
      <div className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-1 mb-2">
        {messages.length > 0 ? (
          messages.map(m => (
            <div key={m.id} className="leading-tight text-slate-200 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
              <span className={`font-bold mr-1 ${m.team === 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {m.senderName}:
              </span>
              <span className="text-slate-100">{m.text}</span>
              <span className="text-[9px] text-slate-500 ml-1.5 float-right font-mono">{m.time}</span>
            </div>
          ))
        ) : (
          <div className="text-slate-500 text-[11px] text-center pt-6 italic">
            Nenhuma mensagem enviada. Mande uma conversa pra mesa! 🍺
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Formulário para Digitar e Enviar Mensagem */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Digitar conversa..."
          maxLength={120}
          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`p-1.5 rounded-lg transition-all ${
            inputText.trim()
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-95'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </aside>
  );
}
