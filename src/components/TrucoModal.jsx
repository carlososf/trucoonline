import React from 'react';
import { Flame, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function TrucoModal({ trucoState, onAccept, onReject, onRaise, isTargetTeam }) {
  if (!trucoState || trucoState.status !== 'PENDING') return null;

  const { pendingLevel, callingTeam } = trucoState;

  const canRaise = pendingLevel < 12;
  const nextRaiseLevel = pendingLevel === 3 ? 6 : pendingLevel === 6 ? 9 : 12;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-5 glow-gold">
        
        {/* Cabeçalho de Alerta */}
        <div className="bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 px-6 py-2 rounded-full font-black text-xl tracking-wider flex items-center gap-2 animate-bounce-short">
          <Flame className="w-6 h-6 fill-slate-950" />
          PEDIRAM {pendingLevel === 3 ? 'TRUCO (3)' : pendingLevel}!
        </div>

        <p className="text-slate-300 text-sm md:text-base">
          O <span className="font-bold text-amber-400">Time {callingTeam}</span> desafiou o seu time para valer <span className="font-black text-amber-400 text-lg">{pendingLevel} pontos</span> nesta mão!
        </p>

        {isTargetTeam ? (
          <div className="flex flex-col gap-3 w-full mt-2">
            {/* Aceitar */}
            <button
              onClick={onAccept}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all text-base md:text-lg"
            >
              <CheckCircle className="w-5 h-5" />
              ACEITAR ({pendingLevel} Pontos)
            </button>

            {/* Aumentar se possível */}
            {canRaise && (
              <button
                onClick={onRaise}
                className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-900/40 transition-all text-base md:text-lg"
              >
                <TrendingUp className="w-5 h-5" />
                PEDIR {nextRaiseLevel}!
              </button>
            )}

            {/* Recusar / Correr */}
            <button
              onClick={onReject}
              className="w-full bg-red-700 hover:bg-red-600 active:scale-95 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition-all text-base md:text-lg"
            >
              <XCircle className="w-5 h-5" />
              RECUSAR / CORRER
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-300/80 bg-amber-950/40 border border-amber-800/40 px-4 py-3 rounded-xl">
            <span className="w-3 h-3 bg-amber-400 rounded-full animate-ping"></span>
            Aguardando a resposta do time adversário...
          </div>
        )}

      </div>
    </div>
  );
}
