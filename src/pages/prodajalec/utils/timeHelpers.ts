/**
 * Pomožne funkcije za čas in odštevanje
 */

export interface TimeRemaining {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  totalHours: number;
}

export interface CountdownFormat {
  text: string;
  color: 'red' | 'orange' | 'green';
}

/**
 * Izračuna preostali čas do konca testa (7 dni od začetka)
 */
export function getTimeRemaining(testStartDate: string | null, currentTime: Date): TimeRemaining | null {
  if (!testStartDate) return null;

  const start = new Date(testStartDate);
  const endTime = start.getTime() + (7 * 24 * 60 * 60 * 1000); // 7 dni
  const now = currentTime.getTime();
  const diffTime = endTime - now;

  if (diffTime < 0) {
    const absDiff = Math.abs(diffTime);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      expired: true,
      days,
      hours,
      minutes: 0,
      totalHours: -(days * 24 + hours)
    };
  }

  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

  return {
    expired: false,
    days,
    hours,
    minutes,
    totalHours: days * 24 + hours
  };
}

/**
 * Formatira preostali čas za prikaz
 */
export function formatCountdown(timeRemaining: TimeRemaining | null): CountdownFormat | null {
  if (!timeRemaining) return null;

  if (timeRemaining.expired) {
    return {
      text: 'Poteklo pred ' + timeRemaining.days + 'd ' + timeRemaining.hours + 'h',
      color: 'red'
    };
  }

  const d = timeRemaining.days;
  const h = timeRemaining.hours;
  const m = timeRemaining.minutes;

  if (d === 0 && h === 0) {
    return { text: '⏰ ' + m + ' minut!', color: 'red' };
  }

  if (d === 0) {
    return { text: '⏰ ' + h + 'h ' + m + 'min', color: 'red' };
  }

  if (d <= 1) {
    return { text: '⏰ ' + d + 'd ' + h + 'h ' + m + 'min', color: 'orange' };
  }

  if (d <= 3) {
    return { text: '⏰ ' + d + 'd ' + h + 'h', color: 'orange' };
  }

  return { text: '⏰ ' + d + 'd ' + h + 'h', color: 'green' };
}
