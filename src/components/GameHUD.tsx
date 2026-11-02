import React from 'react';
import { GameStats, GameState } from '../types/game';
import { soundManager } from '../audio/soundManager';
import {
  Trophy,
  Coins,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Magnet,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Home,
  Gauge,
} from 'lucide-react';

interface GameHUDProps {
  stats: GameStats;
  gameState: GameState;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onJump: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  gameState,
  onPause,
  onResume,
  onRestart,
  onReturnToTitle,
  onMoveLeft,
  onMoveRight,
  onJump,
  isMuted,
  onToggleMute,
}) => {
  const isNewRecord = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-6">
      {/* Top Perimeter HUD Cluster */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Distance & Speed Readout */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Distance */}
          <div className="flex items-center gap-2 bg-slate-900/85 text-white px-3.5 py-1.5 rounded-xl border-2 border-slate-700/80 shadow-lg">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Dist</span>
            <span className="text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-400">
              {stats.distance.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-bold">m</span>
          </div>

          {/* Speed Gauge */}
          <div className="flex items-center gap-2 bg-slate-900/85 text-white px-3 py-1 rounded-xl border border-slate-700/80 shadow-md">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-sm font-black font-mono tabular-nums text-cyan-300">
              {stats.speed}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">km/h</span>
          </div>
        </div>

        {/* Center: Active Power-Up Notification */}
        {(stats.nitroTime > 0 || stats.magnetTime > 0) && (
          <div className="flex flex-col items-center gap-1 pointer-events-auto animate-bounce">
            {stats.nitroTime > 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full shadow-lg border border-cyan-300">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span>NITRO BOOST 2X ({stats.nitroTime.toFixed(1)}s)</span>
              </div>
            )}
            {stats.magnetTime > 0 && stats.nitroTime <= 0 && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-full shadow-lg border border-rose-300">
                <Magnet className="w-4 h-4 text-white" />
                <span>COIN MAGNET ({stats.magnetTime.toFixed(1)}s)</span>
              </div>
            )}
          </div>
        )}

        {/* Right: Coins Counter & Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Coins badge */}
          <div className="flex items-center gap-1.5 bg-amber-500/90 text-amber-950 font-black px-3.5 py-1.5 rounded-xl border-2 border-amber-300 shadow-lg">
            <Coins className="w-5 h-5 text-amber-950 fill-amber-300" />
            <span className="text-lg sm:text-xl font-mono tabular-nums">{stats.coins}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              soundManager.playClick();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="bg-slate-900/85 hover:bg-slate-800 text-white p-2.5 rounded-xl border-2 border-slate-700 shadow-lg cursor-pointer transition active:scale-95"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Pause Button */}
          {gameState === 'playing' && (
            <button
              onClick={() => {
                soundManager.playClick();
                onPause();
              }}
              aria-label="Pause Game"
              className="bg-slate-900/85 hover:bg-slate-800 text-white p-2.5 rounded-xl border-2 border-slate-700 shadow-lg cursor-pointer transition active:scale-95"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom On-Screen Mobile Touch Controls */}
      <div className="w-full flex items-end justify-between pointer-events-auto pb-2 px-1">
        {/* Left & Right Lane Switchers */}
        <div className="flex items-center gap-3">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveLeft();
            }}
            aria-label="Move Left"
            className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900/70 active:bg-amber-500 text-white active:text-slate-950 rounded-2xl border-2 border-slate-600/80 shadow-xl flex items-center justify-center cursor-pointer transition active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="w-8 h-8 stroke-[3]" />
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveRight();
            }}
            aria-label="Move Right"
            className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-900/70 active:bg-amber-500 text-white active:text-slate-950 rounded-2xl border-2 border-slate-600/80 shadow-xl flex items-center justify-center cursor-pointer transition active:scale-95 touch-manipulation"
          >
            <ArrowRight className="w-8 h-8 stroke-[3]" />
          </button>
        </div>

        {/* Jump Button */}
        <div>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              onJump();
            }}
            aria-label="Jump Over Obstacle"
            className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600/80 active:bg-emerald-400 text-white active:text-slate-950 rounded-2xl border-2 border-emerald-400/80 shadow-xl flex flex-col items-center justify-center cursor-pointer transition active:scale-95 touch-manipulation gap-0.5"
          >
            <ArrowUp className="w-8 h-8 stroke-[3]" />
            <span className="text-[10px] font-black uppercase tracking-wider">JUMP</span>
          </button>
        </div>
      </div>

      {/* Pause Modal Overlay */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 pointer-events-auto z-50">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
            <h2 className="text-3xl font-black text-white tracking-wider uppercase">PAUSED</h2>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onResume();
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-lg py-3 rounded-xl shadow-lg border-2 border-emerald-400 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>RESUME</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onRestart();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold py-3 rounded-xl border border-slate-600 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>RESTART</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onReturnToTitle();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold py-3 rounded-xl border border-slate-600 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                <span>TITLE / GARAGE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal Overlay */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 pointer-events-auto z-50">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-600/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
            {/* Crash Header */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">💥</span>
              <h2 className="text-3xl sm:text-4xl font-black text-rose-500 tracking-wider uppercase">
                CRASHED!
              </h2>
              {isNewRecord && (
                <div className="bg-amber-400 text-amber-950 font-black text-xs uppercase px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-amber-300">
                  <Trophy className="w-3.5 h-3.5 fill-current" />
                  <span>NEW BEST RECORD!</span>
                </div>
              )}
            </div>

            {/* Score Breakdown Cards */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl flex flex-col items-center">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Distance</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                  {stats.distance.toLocaleString()} m
                </span>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl flex flex-col items-center">
                <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Coins</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 flex items-center gap-1">
                  <Coins className="w-4 h-4 fill-amber-300 text-amber-500" />
                  {stats.coins}
                </span>
              </div>

              <div className="col-span-2 bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-2 border-amber-500/60 p-3.5 rounded-2xl flex items-center justify-between px-6">
                <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">Total Score</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white">
                  {stats.score.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onRestart();
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-lg sm:text-xl py-3.5 rounded-2xl shadow-[0_5px_0_#065f46] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-emerald-300"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                <span>PLAY AGAIN</span>
                <span className="hidden sm:inline text-xs bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-400/30">
                  SPACE
                </span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onReturnToTitle();
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Home className="w-4 h-4" />
                <span>GARAGE / SELECT CAR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
