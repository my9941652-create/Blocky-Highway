import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { VehicleDef, GameStats, GameState } from './types/game';
import { VEHICLE_PRESETS } from './game/vehiclePresets';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { soundManager } from './audio/soundManager';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDef>(VEHICLE_PRESETS[0]);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [stats, setStats] = useState<GameStats>({
    distance: 0,
    coins: 0,
    speed: 0,
    score: 0,
    highScore: 0,
    multiplier: 1,
    nitroTime: 0,
    magnetTime: 0,
  });

  // Touch gesture tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    // Read saved high score
    const savedHighScore = parseInt(localStorage.getItem('blocky_car_highscore') || '0', 10);
    setStats((prev) => ({ ...prev, highScore: savedHighScore }));

    if (!canvasMountRef.current) return;

    // Initialize Game Engine in isolated container
    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    // Attach callbacks
    engine.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    engine.onGameOver = (finalStats) => {
      setGameState('gameover');
      setStats(finalStats);
    };

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update selected vehicle in engine
  const handleSelectVehicle = (v: VehicleDef) => {
    setSelectedVehicle(v);
    if (engineRef.current) {
      engineRef.current.setVehicle(v);
    }
  };

  // Keyboard navigation & controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const code = e.code;

      if (gameState === 'title') {
        if (code === 'Space' || code === 'Enter') {
          e.preventDefault();
          handleStartGame();
        }
        return;
      }

      if (gameState === 'gameover') {
        if (code === 'Space' || code === 'Enter') {
          e.preventDefault();
          handleRestartGame();
        }
        return;
      }

      if (gameState === 'playing') {
        if (code === 'ArrowLeft' || code === 'KeyA') {
          e.preventDefault();
          engineRef.current?.moveLeft();
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          e.preventDefault();
          engineRef.current?.moveRight();
        } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
          e.preventDefault();
          engineRef.current?.jump();
        } else if (code === 'KeyP' || code === 'Escape') {
          e.preventDefault();
          handlePause();
        }
      } else if (gameState === 'paused') {
        if (code === 'KeyP' || code === 'Escape' || code === 'Space') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    const handleBlur = () => {
      if (gameState === 'playing') {
        handlePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState]);

  // Touch Swipe Handlers for mobile play
  const handleTouchStart = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Detect fast swipe (under 400ms and > 35px)
    if (dt < 450) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
        if (dx > 0) {
          engineRef.current?.moveRight();
        } else {
          engineRef.current?.moveLeft();
        }
      } else if (dy < -35) {
        // Swipe UP to jump
        engineRef.current?.jump();
      }
    }
    touchStartRef.current = null;
  };

  // State transitions
  const handleStartGame = () => {
    setGameState('playing');
    engineRef.current?.startGame();
  };

  const handlePause = () => {
    setGameState('paused');
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    setGameState('playing');
    engineRef.current?.resumeGame();
  };

  const handleRestartGame = () => {
    setGameState('playing');
    engineRef.current?.restartGame();
  };

  const handleReturnToTitle = () => {
    setGameState('title');
    engineRef.current?.returnToTitle();
  };

  const handleToggleMute = () => {
    const nextMute = soundManager.toggleMute();
    setIsMuted(nextMute);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-sky-300 font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 3D WebGL Canvas Viewport (Unobstructed container) */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Screen Shell Overlays */}
      {gameState === 'title' ? (
        <TitleScreen
          selectedVehicle={selectedVehicle}
          onSelectVehicle={handleSelectVehicle}
          onStartGame={handleStartGame}
          highScore={stats.highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <GameHUD
          stats={stats}
          gameState={gameState}
          onPause={handlePause}
          onResume={handleResume}
          onRestart={handleRestartGame}
          onReturnToTitle={handleReturnToTitle}
          onMoveLeft={() => engineRef.current?.moveLeft()}
          onMoveRight={() => engineRef.current?.moveRight()}
          onJump={() => engineRef.current?.jump()}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
    </div>
  );
}
