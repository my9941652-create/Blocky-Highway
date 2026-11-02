import { VehicleDef } from '../types/game';

export const VEHICLE_PRESETS: VehicleDef[] = [
  {
    id: 'roadster',
    name: 'Speedster GT',
    tagline: 'Streamlined racer with spoiler & twin stripes',
    primaryColor: '#dc2626', // Vibrant Red
    secondaryColor: '#facc15', // Racing Yellow
    roofColor: '#991b1b',
    glassColor: '#1e293b',
    accentColor: '#111827',
    wheelColor: '#1f2937',
    wheelRimColor: '#f59e0b',
    type: 'roadster',
    speedBonus: 1.05,
    handling: 1.2,
  },
  {
    id: 'truck',
    name: 'Titan 4x4',
    tagline: 'Chunky off-road pickup with roof bars & cargo bed',
    primaryColor: '#0891b2', // Cyan
    secondaryColor: '#ea580c', // Orange
    roofColor: '#0e7490',
    glassColor: '#0f172a',
    accentColor: '#334155',
    wheelColor: '#18181b',
    wheelRimColor: '#94a3b8',
    type: 'truck',
    speedBonus: 0.98,
    handling: 1.0,
  },
  {
    id: 'van',
    name: 'Retro Cruiser',
    tagline: 'Classic camper van with roof surfboard & wrap windows',
    primaryColor: '#7c3aed', // Purple
    secondaryColor: '#2dd4bf', // Teal
    roofColor: '#f1f5f9',
    glassColor: '#334155',
    accentColor: '#f59e0b',
    wheelColor: '#27272a',
    wheelRimColor: '#cbd5e1',
    type: 'van',
    speedBonus: 0.95,
    handling: 0.95,
  },
  {
    id: 'police',
    name: 'Highway Patrol',
    tagline: 'Interceptor cruiser with flashing emergency siren lights',
    primaryColor: '#0f172a', // Deep Black
    secondaryColor: '#f8fafc', // White
    roofColor: '#ffffff',
    glassColor: '#020617',
    accentColor: '#3b82f6',
    wheelColor: '#1e293b',
    wheelRimColor: '#64748b',
    type: 'police',
    speedBonus: 1.08,
    handling: 1.15,
  },
];
