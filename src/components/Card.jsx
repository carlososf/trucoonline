import React from 'react';

export default function Card({ card, onClick, disabled, isManilha, isSmall, isVira }) {
  if (!card || card.hidden || card.id === 'BACK') {
    return (
      <div 
        className={`relative select-none rounded-lg border-2 border-amber-950 bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 shadow-2xl flex items-center justify-center transition-all ${
          isSmall ? 'w-11 h-16 md:w-14 md:h-20' : 'w-20 h-28 md:w-28 md:h-40 animate-deal-card'
        }`}
      >
        <div className="w-full h-full p-1 opacity-40 flex items-center justify-center">
          <div className="w-full h-full border border-dashed border-amber-500/50 rounded flex items-center justify-center">
            <span className="text-xl md:text-3xl text-amber-500 font-serif">🍺</span>
          </div>
        </div>
      </div>
    );
  }

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative select-none rounded-xl border-2 transition-all duration-200 flex flex-col justify-between p-2 shadow-2xl ${
        isRed ? 'text-red-700 bg-amber-50 border-red-300' : 'text-slate-900 bg-amber-50 border-slate-400'
      } ${
        disabled ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-3 hover:shadow-amber-500/30 hover:border-amber-500 cursor-pointer active:scale-95'
      } ${
        isManilha ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950' : ''
      } ${
        isVira ? 'ring-2 ring-amber-400' : ''
      } ${
        isSmall ? 'w-11 h-16 text-xs p-1' : 'w-20 h-28 md:w-28 md:h-40 text-base animate-deal-card'
      }`}
    >
      {isManilha && (
        <div className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] md:text-[11px] px-1.5 py-0.5 rounded-full shadow-lg animate-pulse border border-amber-200">
          ZAP / MANILHA
        </div>
      )}

      {/* Canto Superior Esquerdo */}
      <div className="flex flex-col items-start leading-none">
        <span className="font-black text-base md:text-2xl font-mono tracking-tighter">{card.value}</span>
        <span className="text-xs md:text-lg">{card.suit}</span>
      </div>

      {/* Centro da Carta */}
      <div className="self-center font-black text-2xl md:text-5xl my-auto opacity-90">
        {card.suit}
      </div>

      {/* Canto Inferior Direito */}
      <div className="flex flex-col items-end leading-none rotate-180 self-end">
        <span className="font-black text-base md:text-2xl font-mono tracking-tighter">{card.value}</span>
        <span className="text-xs md:text-lg">{card.suit}</span>
      </div>
    </button>
  );
}
