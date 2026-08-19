import React from 'react';
import { Trophy, Users, ShieldAlert } from 'lucide-react';

export default function Scoreboard({ roomState, currentPlayer }) {
  if (!roomState) return null;

  const { scores, currentHand, roomId, players } = roomState;
  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);

  const rounds = currentHand?.rounds || [];

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-emerald-900/50 px-4 py-3 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl z-20">
      {/* Sala & Info */}
      <div className="flex items-center gap-3">
        <div className="bg-emerald-950 border border-emerald-700/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase">SALA:</span>
          <span className="font-mono font-black text-amber-400 text-lg tracking-widest">{roomId}</span>
        </div>
        
        {currentHand && (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-lg font-bold text-sm">
            <span>MÃO VALE:</span>
            <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black text-base">
              {currentHand.handValue} Ponto{currentHand.handValue > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Placar Principal */}
      <div className="flex items-center gap-6 bg-slate-950/80 px-6 py-2 rounded-xl border border-slate-800 shadow-inner">
        {/* Time 1 */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-end gap-1">
              Time 1 {currentPlayer?.team === 1 && <span className="text-[10px] bg-emerald-800 text-white px-1.5 py-0.2 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[120px]">
              {team1Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
          <span className="font-black text-3xl text-emerald-400 font-mono">{scores?.team1 ?? 0}</span>
        </div>

        <div className="text-slate-600 font-bold text-xl">VS</div>

        {/* Time 2 */}
        <div className="flex items-center gap-3">
          <span className="font-black text-3xl text-amber-400 font-mono">{scores?.team2 ?? 0}</span>
          <div className="text-left">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              Time 2 {currentPlayer?.team === 2 && <span className="text-[10px] bg-amber-800 text-white px-1.5 py-0.2 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[120px]">
              {team2Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores de Rodadas (Melhor de 3) */}
      {currentHand && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rodadas:</span>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(idx => {
              const r = rounds[idx];
              let bg = 'bg-slate-800 border-slate-700';
              let label = idx + 1;
              if (r) {
                if (r.winnerTeam === 1) {
                  bg = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400';
                  label = 'T1';
                } else if (r.winnerTeam === 2) {
                  bg = 'bg-amber-500 text-slate-950 font-bold border-amber-400';
                  label = 'T2';
                } else {
                  bg = 'bg-slate-400 text-slate-950 font-bold border-slate-300';
                  label = '=';
                }
              }

              return (
                <div
                  key={idx}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-all ${bg}`}
                  title={`Rodada ${idx + 1}`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
