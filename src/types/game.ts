import type * as THREE from 'three';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export interface VehicleDef {
  id: string;
  name: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  roofColor: string;
  glassColor: string;
  accentColor: string;
  wheelColor: string;
  wheelRimColor: string;
  type: 'roadster' | 'truck' | 'van' | 'police';
  speedBonus: number;
  handling: number;
}

export type LaneIndex = -1 | 0 | 1; // -1: Left, 0: Center, 1: Right

export const LANE_WIDTH = 2.6; // Distance between lanes in 3D units

export interface ObstacleObject {
  id: number;
  type: 'barrier' | 'crate' | 'rock' | 'traffic';
  lane: LaneIndex;
  z: number;
  width: number;
  height: number;
  depth: number;
  speed?: number; // For traffic cars
  mesh: THREE.Group;
  passed?: boolean;
}

export interface CoinObject {
  id: number;
  lane: LaneIndex;
  z: number;
  y: number;
  mesh: THREE.Group;
  collected?: boolean;
}

export interface PowerUpObject {
  id: number;
  type: 'magnet' | 'nitro';
  lane: LaneIndex;
  z: number;
  y: number;
  mesh: THREE.Group;
  collected?: boolean;
}

export interface GameStats {
  distance: number;
  coins: number;
  speed: number;
  score: number;
  highScore: number;
  multiplier: number;
  nitroTime: number;
  magnetTime: number;
}
