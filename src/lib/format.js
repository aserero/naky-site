// Helpers d'affichage — UNIQUE implémentation du parsing/formatage durée & heure.
// bookings.duration_minutes est un entier (minutes) ; bookings.start_time est "HH:MM[:SS]".

// 150 -> "2h30", 180 -> "3h"
export function formatDuration(minutes) {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

// minutes -> heures décimales exactes (150 -> 2.5)
export function durationToHours(minutes) {
  return minutes == null ? 0 : minutes / 60;
}

// "14:00:00" | "14:00" -> "14h" ; "14:30" -> "14h30"
export function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return m === '00' || m === undefined ? `${hour}h` : `${hour}h${m}`;
}

// "14:00:00" -> "14:00" (normalise la valeur SQL time pour les <select>)
export function timeToHHMM(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

export function formatPrice(amount) {
  if (amount == null) return '';
  return `${Number(amount).toFixed(2).replace('.', ',').replace(',00', '')}€`;
}
