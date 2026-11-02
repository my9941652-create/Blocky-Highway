import React from 'react';
import { VehicleDef } from '../types/game';
import { VEHICLE_PRESETS } from '../game/vehiclePresets';
import { soundManager } from '../audio/soundManager';
import { Trophy, Volume2, VolumeX, Sparkles, ChevronLeft, ChevronRight, Gauge, Zap } from 'lucide-react';

interface TitleScreenProps {
  selectedVehicle: VehicleDef;
  onSelectVehicle: (v: VehicleDef) => void;
  onStartGame: () => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedVehicle,
  onSelectVehicle,
  onStartGame,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  const currentIndex = VEHICLE_PRESETS.findIndex((v) => v.id === selectedVehicle.id);

  const handlePrevVehicle = () => {
    soundManager.playClick();
    const nextIdx = (currentIndex - 1 + VEHICLE_PRESETS.length) % VEHICLE_PRESETS.length;
    onSelectVehicle(VEHICLE_PRESETS[nextIdx]);
  };

  const handleNextVehicle = () => {
    soundManager.playClick();
    const nextIdx = (currentIndex + 1) % VEHICLE_PRESETS.length;
    onSelectVehicle(VEHICLE_PRESETS[nextIdx]);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 select-none z-20">
      {/* Top Header Cluster */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* High Score Badge */}
        <div className="flex items-center gap-2.5 bg-amber-500/90 text-amber-950 font-black px-4 py-2 rounded-xl shadow-lg border-2 border-amber-300">
          <Trophy className="w-5 h-5 text-amber-900" />
          <div className="flex flex-col leading-none">
            <span className="text-[10px] tracking-wider uppercase opacity-80">Best Run</span>
            <span className="text-lg font-mono tabular-nums">{highScore.toLocaleString()} m</span>
          </div>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => {
            soundManager.playClick();
            onToggleMute();
          }}
          aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="bg-slate-900/80 hover:bg-slate-800 text-white p-3 rounded-xl shadow-lg border-2 border-slate-700 transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* Center Title Lockup */}
      <div className="flex flex-col items-center text-center mt-[-40px]">
        {/* Custom 3D Voxel Lockup */}
        <div className="relative mb-2">
          <svg className="w-[320px] sm:w-[460px] md:w-[580px] h-auto drop-shadow-[0_8px_0_rgba(15,23,42,0.85)]" viewBox="0 0 540 110" fill="none">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#fde047" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="52"
              textAnchor="middle"
              className="font-black text-5xl tracking-widest uppercase"
              fill="url(#titleGrad)"
              stroke="#0f172a"
              strokeWidth="6"
              paintOrder="stroke fill"
              style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 900 }}
            >
              BLOCKY
            </text>
            <text
              x="50%"
              y="98"
              textAnchor="middle"
              className="font-black text-4xl tracking-wider uppercase"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="6"
              paintOrder="stroke fill"
              style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 900 }}
            >
              HIGHWAY 3D
            </text>
          </svg>
        </div>

        <p className="text-white font-bold text-sm sm:text-base tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] bg-slate-900/60 px-4 py-1 rounded-full border border-white/20">
          Endless Voxel Arcade Runner
        </p>
      </div>

      {/* Bottom Vehicle Selection Dock & Start CTA */}
      <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-4 pointer-events-auto pb-4">
        {/* Vehicle Carousel */}
        <div className="w-full bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevVehicle}
              aria-label="Previous Vehicle"
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl transition cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center">
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Selected Ride</span>
              <h3 className="text-xl font-black text-white">{selectedVehicle.name}</h3>
              <p className="text-xs text-slate-300 max-w-[280px] truncate">{selectedVehicle.tagline}</p>
            </div>

            <button
              onClick={handleNextVehicle}
              aria-label="Next Vehicle"
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-xl transition cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Vehicle Stats Mini-Pills */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
            <div className="flex items-center justify-center gap-1.5 bg-slate-800/80 py-1.5 px-3 rounded-lg text-slate-200">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed: <strong>{Math.round(selectedVehicle.speedBonus * 100)}%</strong></span>
            </div>
            <div className="flex items-center justify-center gap-1.5 bg-slate-800/80 py-1.5 px-3 rounded-lg text-slate-200">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Handling: <strong>{Math.round(selectedVehicle.handling * 100)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Start Game Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onStartGame();
          }}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xl sm:text-2xl py-4 px-8 rounded-2xl shadow-[0_6px_0_#065f46] hover:shadow-[0_4px_0_#065f46] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-3 border-2 border-emerald-300"
        >
          <Sparkles className="w-6 h-6 animate-spin text-yellow-300" />
          <span>START DRIVING</span>
          <span className="hidden sm:inline text-xs font-semibold uppercase bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300/40">
            SPACE
          </span>
        </button>

        {/* Control Hints Line */}
        <div className="text-white/90 text-xs font-semibold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] flex items-center justify-center gap-3 flex-wrap">
          <span><strong className="text-amber-300">A / D</strong> or <strong className="text-amber-300">← / →</strong> Steer</span>
          <span>•</span>
          <span><strong className="text-amber-300">Space / W</strong> Jump</span>
          <span>•</span>
          <span><strong className="text-amber-300">P / Esc</strong> Pause</span>
        </div>
      </div>
    </div>
  );
};
