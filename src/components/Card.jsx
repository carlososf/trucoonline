import React from 'react';

export default function Card({ card, onClick, disabled, isManilha, isSmall, isVira }) {
  if (!card || card.hidden || card.id === 'BACK') {
    return (
      <div 
        className={`relative select-none rounded-xl border-2 border-slate-700 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 shadow-xl flex items-center justify-center transition-transform ${
          isSmall ? 'w-12 h-16 md:w-16 md:h-24' : 'w-20 h-28 md:w-28 md:h-40'
        }`}
      >
        <div className="w-full h-full p-1.5 opacity-30 flex items-center justify-center">
          <div className="w-full h-full border border-dashed border-indigo-400 rounded-lg flex items-center justify-center">
            <span className="text-xl md:text-3xl">🂠</span>
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
        isRed ? 'text-red-600 bg-white border-red-200' : 'text-slate-900 bg-white border-slate-300'
      } ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-3 hover:shadow-emerald-500/20 hover:border-emerald-400 cursor-pointer active:scale-95'
      } ${
        isManilha ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-table-dark' : ''
      } ${
        isVira ? 'ring-2 ring-amber-300' : ''
      } ${
        isSmall ? 'w-12 h-16 text-xs p-1' : 'w-20 h-28 md:w-28 md:h-40 text-base'
      }`}
    >
      {isManilha && (
        <div className="absolute -top-3 -right-2 bg-amber-500 text-slate-950 font-black text-[10px] md:text-xs px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
          MANILHA
        </div>
      )}

      {/* Canto Superior Esquerdo */}
      <div className="flex flex-col items-start leading-none">
        <span className="font-extrabold text-sm md:text-xl tracking-tighter">{card.value}</span>
        <span className="text-xs md:text-lg">{card.suit}</span>
      </div>

      {/* Centro da Carta */}
      <div className="self-center font-black text-2xl md:text-4xl my-auto opacity-90">
        {card.suit}
      </div>

      {/* Canto Inferior Direito */}
      <div className="flex flex-col items-end leading-none rotate-180 self-end">
        <span className="font-extrabold text-sm md:text-xl tracking-tighter">{card.value}</span>
        <span className="text-xs md:text-lg">{card.suit}</span>
      </div>
    </button>
  );
}
