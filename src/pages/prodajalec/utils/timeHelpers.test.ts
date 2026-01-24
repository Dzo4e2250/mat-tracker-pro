import { describe, it, expect } from 'vitest';
import { getTimeRemaining, formatCountdown, TimeRemaining } from './timeHelpers';

describe('timeHelpers', () => {
  describe('getTimeRemaining', () => {
    it('should return null for null testStartDate', () => {
      const result = getTimeRemaining(null, new Date());
      expect(result).toBeNull();
    });

    it('should calculate remaining time correctly - 6 days left', () => {
      const testStart = new Date('2026-01-20T10:00:00Z');
      const currentTime = new Date('2026-01-21T10:00:00Z'); // 1 day after start

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(false);
      expect(result!.days).toBe(6);
      expect(result!.hours).toBe(0);
      expect(result!.totalHours).toBe(144); // 6 * 24
    });

    it('should calculate remaining time correctly - 3 days 12 hours left', () => {
      const testStart = new Date('2026-01-20T10:00:00Z');
      const currentTime = new Date('2026-01-23T22:00:00Z'); // 3.5 days after start

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(false);
      expect(result!.days).toBe(3);
      expect(result!.hours).toBe(12);
    });

    it('should return expired = true when test period has ended', () => {
      const testStart = new Date('2026-01-10T10:00:00Z');
      const currentTime = new Date('2026-01-20T10:00:00Z'); // 10 days after start

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(true);
      expect(result!.days).toBe(3); // expired 3 days ago
      expect(result!.totalHours).toBeLessThan(0);
    });

    it('should calculate exact expiration - just expired', () => {
      const testStart = new Date('2026-01-10T10:00:00Z');
      const currentTime = new Date('2026-01-17T12:00:00Z'); // 7 days + 2 hours

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(true);
      expect(result!.days).toBe(0);
      expect(result!.hours).toBe(2);
    });

    it('should handle less than 24 hours remaining', () => {
      const testStart = new Date('2026-01-20T10:00:00Z');
      const currentTime = new Date('2026-01-26T20:00:00Z'); // 6 days 10 hours after start

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(false);
      expect(result!.days).toBe(0);
      expect(result!.hours).toBe(14);
    });

    it('should handle less than 1 hour remaining', () => {
      const testStart = new Date('2026-01-20T10:00:00Z');
      const currentTime = new Date('2026-01-27T09:30:00Z'); // 6 days 23.5 hours after start

      const result = getTimeRemaining(testStart.toISOString(), currentTime);

      expect(result).not.toBeNull();
      expect(result!.expired).toBe(false);
      expect(result!.days).toBe(0);
      expect(result!.hours).toBe(0);
      expect(result!.minutes).toBe(30);
    });
  });

  describe('formatCountdown', () => {
    it('should return null for null input', () => {
      const result = formatCountdown(null);
      expect(result).toBeNull();
    });

    it('should format expired time with red color', () => {
      const timeRemaining: TimeRemaining = {
        expired: true,
        days: 2,
        hours: 5,
        minutes: 0,
        totalHours: -53,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toBe('Poteklo pred 2d 5h');
      expect(result!.color).toBe('red');
    });

    it('should format minutes only with red color', () => {
      const timeRemaining: TimeRemaining = {
        expired: false,
        days: 0,
        hours: 0,
        minutes: 45,
        totalHours: 0,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('45 minut');
      expect(result!.color).toBe('red');
    });

    it('should format hours with red color when less than 1 day', () => {
      const timeRemaining: TimeRemaining = {
        expired: false,
        days: 0,
        hours: 5,
        minutes: 30,
        totalHours: 5,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('5h');
      expect(result!.text).toContain('30min');
      expect(result!.color).toBe('red');
    });

    it('should format 1 day with orange color', () => {
      const timeRemaining: TimeRemaining = {
        expired: false,
        days: 1,
        hours: 12,
        minutes: 30,
        totalHours: 36,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('1d');
      expect(result!.text).toContain('12h');
      expect(result!.color).toBe('orange');
    });

    it('should format 2-3 days with orange color', () => {
      const timeRemaining: TimeRemaining = {
        expired: false,
        days: 2,
        hours: 8,
        minutes: 0,
        totalHours: 56,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('2d');
      expect(result!.color).toBe('orange');
    });

    it('should format more than 3 days with green color', () => {
      const timeRemaining: TimeRemaining = {
        expired: false,
        days: 5,
        hours: 10,
        minutes: 0,
        totalHours: 130,
      };

      const result = formatCountdown(timeRemaining);

      expect(result).not.toBeNull();
      expect(result!.text).toContain('5d');
      expect(result!.color).toBe('green');
    });
  });
});
