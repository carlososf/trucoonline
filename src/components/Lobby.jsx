import React, { useState } from 'react';
import { Play, PlusCircle, LogIn, Users, ShieldCheck, Copy, Check } from 'lucide-react';

export default function Lobby({ onCreateRoom, onJoinRoom, onStartGame, roomState, currentPlayer }) {
  const [name, setName] = useState(currentPlayer?.name || '');
  const [roomCode, setRoomCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [copied, setCopied] = useState(false);

  const isHost = roomState?.players[0]?.playerId === currentPlayer?.playerId;

  const handleCopyCode = () => {
    if (roomState?.roomId) {
      navigator.clipboard.writeText(roomState.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (roomState) {
    // Tela de Espera na Sala
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <div className="bg-slate-900 border border-emerald-800/80 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-100 flex items-center justify-center gap-2">
              <Users className="w-6 h-6 text-emerald-400" />
              SALA DE ESPERA
            </h2>
            <p className="text-slate-400 text-sm">Compartilhe o código abaixo com seu adversário/parceiro</p>
          </div>

          {/* Código da Sala */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="text-left">
              <div className="text-xs text-slate-500 font-bold uppercase">Código da Sala</div>
              <div className="font-mono text-3xl font-black text-amber-400 tracking-widest">{roomState.roomId}</div>
            </div>
            <button
              onClick={handleCopyCode}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          {/* Lista de Jogadores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Jogadores na Sala ({roomState.players.length}/{roomState.maxPlayers})</span>
              <span>Time</span>
            </div>

            <div className="space-y-2">
              {roomState.players.map((p, idx) => (
                <div
                  key={p.playerId}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    p.playerId === currentPlayer?.playerId
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="font-bold">{p.name}</span>
                    {p.playerId === currentPlayer?.playerId && (
                      <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded font-semibold">
                        Você
                      </span>
                    )}
                    {idx === 0 && (
                      <span className="text-[10px] bg-amber-600 text-slate-950 px-2 py-0.5 rounded font-bold">
                        Host
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    p.team === 1 ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50' : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                  }`}>
                    Time {p.team}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Iniciar Jogo */}
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={roomState.players.length < 2}
              className={`w-full py-4 px-6 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
                roomState.players.length >= 2
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-900/50 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-5 h-5 fill-slate-950" />
              {roomState.players.length >= 2 ? 'INICIAR PARTIDA DE TRUCO' : 'AGUARDANDO MAIS JOGADORES...'}
            </button>
          ) : (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-slate-400 text-sm flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
              Aguardando o Host iniciar a partida...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
      <div className="bg-slate-900 border border-emerald-900/60 rounded-3xl p-6 md:p-10 max-w-md w-full shadow-2xl space-y-8 backdrop-blur-md">
        
        {/* Título */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-950 border border-emerald-700/50 text-emerald-400 px-4 py-1.5 rounded-full font-bold text-xs tracking-widest uppercase">
            ♠ ♥ ♣ ♦ Truco Online
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">TRUCO WEB</h1>
          <p className="text-slate-400 text-sm">Crie uma sala ou entre pelo código curto</p>
        </div>

        {/* Input de Nome */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Seu Apelido / Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome..."
            maxLength={16}
            className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-white font-semibold outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Criar Sala */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Modo de Jogo</span>
            <div className="flex gap-2">
              <button
                onClick={() => setMaxPlayers(2)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  maxPlayers === 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1v1 (2 Jogadores)
              </button>
              <button
                onClick={() => setMaxPlayers(4)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  maxPlayers === 4 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                2v2 (4 Jogadores)
              </button>
            </div>
          </div>

          <button
            onClick={() => name.trim() && onCreateRoom(name, maxPlayers)}
            disabled={!name.trim()}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              name.trim()
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60 active:scale-95 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            CRIAR NOVA SALA
          </button>
        </div>

        {/* Entrar em Sala Existente */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Entrar em Sala Existente</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO (ex: TRUCO1)"
              maxLength={6}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-widest outline-none transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:tracking-normal"
            />
            <button
              onClick={() => name.trim() && roomCode.trim() && onJoinRoom(roomCode, name)}
              disabled={!name.trim() || !roomCode.trim()}
              className={`px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shrink-0 ${
                name.trim() && roomCode.trim()
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <LogIn className="w-4 h-4" />
              ENTRAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
