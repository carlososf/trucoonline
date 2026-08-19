import React from 'react';
import { Volume2, VolumeX, Flame, Beer, ShieldAlert } from 'lucide-react';

export default function Scoreboard({ roomState, currentPlayer, isMuted, onToggleMute }) {
  if (!roomState) return null;

  const { scores, currentHand, roomId, players } = roomState;
  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);

  const rounds = currentHand?.rounds || [];

  return (
    <header className="w-full lousa-boteco px-4 py-2.5 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl z-20 border-b-4 border-amber-900">
      
      {/* Esquerda: Identificação da Mesa & Som */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm tracking-wider">
          <Beer className="w-5 h-5 text-amber-500 animate-bounce" />
          <span className="hidden sm:inline font-mono font-black">BOTECO DO TRUCO</span>
        </div>

        <div className="bg-slate-950 border border-amber-500/50 px-3 py-1 rounded-xl flex items-center gap-2 shadow">
          <span className="text-[10px] text-slate-400 font-mono font-bold">MESA:</span>
          <span className="font-mono font-black text-amber-400 text-base tracking-widest">{roomId}</span>
        </div>

        <button
          onClick={onToggleMute}
          className="bg-slate-900 hover:bg-slate-800 text-amber-400 p-1.5 rounded-xl border border-amber-500/40 transition-all active:scale-95 shadow"
          title={isMuted ? 'Ativar Efeitos Sonoros' : 'Desativar Efeitos Sonoros'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Centro: Placar Estilo Lousa de Giz de Bar */}
      <div className="flex items-center gap-6 bg-slate-950/95 px-6 py-2 rounded-2xl border-2 border-amber-800/80 shadow-2xl">
        {/* Time 1 */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-mono font-black text-emerald-400 uppercase tracking-wider flex items-center justify-end gap-1">
              Time 1 {currentPlayer?.team === 1 && <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 font-sans truncate max-w-[100px]">
              {team1Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
          <span className="font-mono font-black text-3xl md:text-4xl text-emerald-400 tracking-widest drop-shadow-md">
            {scores?.team1 ?? 0}
          </span>
        </div>

        <div className="text-amber-500/80 font-mono text-base font-black">X</div>

        {/* Time 2 */}
        <div className="flex items-center gap-3">
          <span className="font-mono font-black text-3xl md:text-4xl text-amber-400 tracking-widest drop-shadow-md">
            {scores?.team2 ?? 0}
          </span>
          <div className="text-left">
            <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
              Time 2 {currentPlayer?.team === 2 && <span className="text-[9px] bg-amber-900 text-amber-200 px-1 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 font-sans truncate max-w-[100px]">
              {team2Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
        </div>
      </div>

      {/* Direita: Valor da Mão & Indicadores de Rodada */}
      {currentHand && (
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 border border-amber-500/60 text-amber-300 px-3 py-1 rounded-xl text-xs font-mono font-black flex items-center gap-1.5 shadow">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>{currentHand.handValue} PT{currentHand.handValue > 1 ? 'S' : ''}</span>
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2].map(idx => {
              const r = rounds[idx];
              let bg = 'bg-slate-900 border-slate-700 text-slate-500';
              let label = idx + 1;
              if (r) {
                if (r.winnerTeam === 1) {
                  bg = 'bg-emerald-600 text-slate-950 font-bold border-emerald-400 shadow-md';
                  label = 'T1';
                } else if (r.winnerTeam === 2) {
                  bg = 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-md';
                  label = 'T2';
                } else {
                  bg = 'bg-slate-400 text-slate-950 font-bold border-slate-200 shadow-md';
                  label = '=';
                }
              }

              return (
                <div
                  key={idx}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono font-bold ${bg}`}
                  title={`Rodada ${idx + 1}`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
