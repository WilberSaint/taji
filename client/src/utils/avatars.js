import { Sun, Wind, Droplets, Flame, Leaf, Zap, Sparkles, Star, Bot } from 'lucide-react';

/**
 * Catálogo de avatares — íconos SVG (lucide), no emoji.
 * El servidor solo guarda el `id`; el color y el ícono se resuelven aquí.
 */
export const AVATARS = [
  { id: 'sun', Icon: Sun, color: 'var(--solar)' },
  { id: 'wind', Icon: Wind, color: 'var(--wind)' },
  { id: 'droplets', Icon: Droplets, color: 'var(--hydro)' },
  { id: 'flame', Icon: Flame, color: 'var(--geo)' },
  { id: 'leaf', Icon: Leaf, color: 'var(--success)' },
  { id: 'zap', Icon: Zap, color: 'var(--accent-bright)' },
  { id: 'sparkles', Icon: Sparkles, color: 'var(--player-4)' },
  { id: 'star', Icon: Star, color: 'var(--primary)' },
];

const BOT_AVATAR = { id: 'bot', Icon: Bot, color: 'var(--ink-faint)' };

export const DEFAULT_AVATAR_ID = AVATARS[0].id;

export function getAvatarById(id) {
  if (id === 'bot') return BOT_AVATAR;
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}
