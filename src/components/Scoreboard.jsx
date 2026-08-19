import React from 'react';
import { Volume2, VolumeX, Flame, Beer } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function Scoreboard({ roomState, currentPlayer, isMuted, onToggleMute }) {
  if (!roomState) return null;

  const { scores, currentHand, roomId, players } = roomState;
  const team1Players = players.filter(p => p.team === 1);
  const team2Players = players.filter(p => p.team === 2);

  const rounds = currentHand?.rounds || [];

  return (
    <div className="w-full lousa-boteco px-4 py-3 text-slate-100 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xl z-20">
      
      {/* Esquerda: Nome do Boteco & Sala */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm tracking-wider">
          <Beer className="w-5 h-5 text-amber-500 animate-bounce" />
          <span className="hidden sm:inline">BOTECO DO TRUCO</span>
        </div>

        <div className="bg-slate-900 border border-amber-500/40 px-3 py-1 rounded flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono">SALA:</span>
          <span className="font-mono font-bold text-amber-400 text-base tracking-widest">{roomId}</span>
        </div>

        {/* Botão de Áudio (Som Mute/Unmute) */}
        <button
          onClick={onToggleMute}
          className="bg-slate-800 hover:bg-slate-700 text-amber-400 p-1.5 rounded border border-amber-500/30 transition-all active:scale-95"
          title={isMuted ? 'Ativar Efeitos Sonoros' : 'Desativar Efeitos Sonoros'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Centro: Placar Estilo Lousa com Giz */}
      <div className="flex items-center gap-6 bg-slate-950/90 px-6 py-1.5 rounded border border-slate-700">
        {/* Time 1 */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-end gap-1">
              Time 1 {currentPlayer?.team === 1 && <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[100px]">
              {team1Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
          <span className="font-mono font-extrabold text-3xl text-emerald-400 tracking-wider">{scores?.team1 ?? 0}</span>
        </div>

        <div className="text-amber-500/60 font-mono text-xs font-black">X</div>

        {/* Time 2 */}
        <div className="flex items-center gap-3">
          <span className="font-mono font-extrabold text-3xl text-amber-400 tracking-wider">{scores?.team2 ?? 0}</span>
          <div className="text-left">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              Time 2 {currentPlayer?.team === 2 && <span className="text-[9px] bg-amber-900 text-amber-200 px-1 rounded">Você</span>}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[100px]">
              {team2Players.map(p => p.name).join(', ') || 'Aguardando'}
            </div>
          </div>
        </div>
      </div>

      {/* Direita: Valor da Mão e Rodadas */}
      {currentHand && (
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/15 border border-amber-500/50 text-amber-300 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>VALE {currentHand.handValue} PT{currentHand.handValue > 1 ? 'S' : ''}</span>
          </div>

          <div className="flex gap-1">
            {[0, 1, 2].map(idx => {
              const r = rounds[idx];
              let bg = 'bg-slate-900 border-slate-700 text-slate-500';
              let label = idx + 1;
              if (r) {
                if (r.winnerTeam === 1) {
                  bg = 'bg-emerald-600 text-slate-950 font-bold border-emerald-400';
                  label = 'T1';
                } else if (r.winnerTeam === 2) {
                  bg = 'bg-amber-500 text-slate-950 font-bold border-amber-300';
                  label = 'T2';
                } else {
                  bg = 'bg-slate-400 text-slate-950 font-bold border-slate-200';
                  label = '=';
                }
              }

              return (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold ${bg}`}
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
