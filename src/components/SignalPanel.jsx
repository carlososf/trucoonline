import React from 'react';
import { Eye, Smile, Frown, Sparkles } from 'lucide-react';

export const SIGNALS = [
  { id: 'ZAP', name: 'Zap (♣)', emoji: '👁️', desc: 'Piscar Olho', soundKey: 'zap' },
  { id: 'COPAS', name: 'Copas (♥)', emoji: '👅', desc: 'Mostrar Língua', soundKey: 'copas' },
  { id: 'ESPADILHA', name: 'Espadilha (♠)', emoji: '🤨', desc: 'Sobrancelha', soundKey: 'espadilha' },
  { id: 'OUROS', name: 'Ouros (♦)', emoji: '🫦', desc: 'Morder Lábio', soundKey: 'ouros' },
  { id: 'FORA', name: 'Fora / Fraco', emoji: '🧔', desc: 'Coçar Queixo', soundKey: 'fora' },
];

export default function SignalPanel({ onSendSignal, disabled }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-2xl border border-amber-500/40 shadow-xl backdrop-blur-md">
      <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-tighter px-1 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-amber-400" />
        <span>Sinais:</span>
      </div>

      <div className="flex items-center gap-1">
        {SIGNALS.map(sig => (
          <button
            key={sig.id}
            onClick={() => !disabled && onSendSignal(sig)}
            disabled={disabled}
            className={`px-2 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border shadow ${
              disabled
                ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border-amber-500/30 hover:border-amber-400 active:scale-95 cursor-pointer'
            }`}
            title={`Passar Sinal Secreto: ${sig.name} (${sig.desc})`}
          >
            <span className="text-sm">{sig.emoji}</span>
            <span className="hidden lg:inline text-[10px]">{sig.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
