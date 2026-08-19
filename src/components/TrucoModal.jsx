import React, { useEffect } from 'react';
import { Flame, CheckCircle, XCircle, TrendingUp, Beer } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export default function TrucoModal({ trucoState, onAccept, onReject, onRaise, isTargetTeam }) {
  useEffect(() => {
    if (trucoState && trucoState.status === 'PENDING') {
      sounds.playTrucoSlam(); // Toca a batida forte de truco na mesa!
    }
  }, [trucoState]);

  if (!trucoState || trucoState.status !== 'PENDING') return null;

  const { pendingLevel, callingTeam } = trucoState;
  const canRaise = pendingLevel < 12;
  const nextRaiseLevel = pendingLevel === 3 ? 6 : pendingLevel === 6 ? 9 : 12;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border-4 border-amber-600 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-5 shake-truco glow-gold">
        
        {/* Cabeçalho de Alerta de Boteco */}
        <div className="bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-slate-950 px-6 py-2 rounded-full font-black text-2xl tracking-wider flex items-center gap-2 border-2 border-amber-300">
          <Flame className="w-7 h-7 fill-slate-950 animate-bounce" />
          GRITARAM {pendingLevel === 3 ? 'TRUCO!' : `${pendingLevel}!`}
        </div>

        <div className="space-y-1 text-slate-200">
          <p className="text-base md:text-lg">
            O <span className="font-extrabold text-amber-400">Time {callingTeam}</span> bateu na mesa e desafiou o seu time pra valer <span className="font-black text-amber-400 text-2xl">{pendingLevel} PONTOS</span>!
          </p>
        </div>

        {isTargetTeam ? (
          <div className="flex flex-col gap-3 w-full mt-2">
            {/* Aceitar */}
            <button
              onClick={() => { sounds.playAccept(); onAccept(); }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 transition-all text-lg border border-emerald-400"
            >
              <CheckCircle className="w-6 h-6" />
              ACEITAR ({pendingLevel} PONTOS)
            </button>

            {/* Aumentar */}
            {canRaise && (
              <button
                onClick={() => { sounds.playTrucoSlam(); onRaise(); }}
                className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-amber-950/60 transition-all text-lg border border-amber-400"
              >
                <TrendingUp className="w-6 h-6" />
                PEDIR {nextRaiseLevel}!
              </button>
            )}

            {/* Recusar / Correr */}
            <button
              onClick={() => { sounds.playReject(); onReject(); }}
              className="w-full bg-red-700 hover:bg-red-600 active:scale-95 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-red-950/60 transition-all text-lg border border-red-500"
            >
              <XCircle className="w-6 h-6" />
              CORRER / RECUSAR
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-300 bg-slate-950 px-4 py-3 rounded-xl border border-amber-800/50 text-sm font-semibold">
            <Beer className="w-5 h-5 text-amber-400 animate-spin" />
            Aguardando a resposta dos adversários...
          </div>
        )}

      </div>
    </div>
  );
}
