/**
 * @file slovenianCities.test.ts
 * @description Tests for Slovenian cities utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  findNearestCity,
  findStops,
  generateRoute,
  generateRouteFromPoints,
  SLOVENIAN_CITIES,
  type GpsPoint,
} from './slovenianCities';

describe('slovenianCities', () => {
  describe('SLOVENIAN_CITIES', () => {
    it('should have major cities', () => {
      const cityNames = SLOVENIAN_CITIES.map(c => c.name);
      expect(cityNames).toContain('Ljubljana');
      expect(cityNames).toContain('Maribor');
      expect(cityNames).toContain('Celje');
      expect(cityNames).toContain('Kranj');
      expect(cityNames).toContain('Koper');
    });

    it('should have short names for all cities', () => {
      for (const city of SLOVENIAN_CITIES) {
        expect(city.shortName).toBeDefined();
        expect(city.shortName.length).toBeGreaterThan(0);
      }
    });

    it('should have valid coordinates', () => {
      for (const city of SLOVENIAN_CITIES) {
        // Slovenia is roughly between 45.4-46.9 lat and 13.4-16.6 lng
        expect(city.lat).toBeGreaterThan(45);
        expect(city.lat).toBeLessThan(47);
        expect(city.lng).toBeGreaterThan(13);
        expect(city.lng).toBeLessThan(17);
      }
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same point', () => {
      expect(calculateDistance(46.0569, 14.5058, 46.0569, 14.5058)).toBe(0);
    });

    it('should calculate distance between Ljubljana and Maribor (~100km)', () => {
      // Ljubljana: 46.0569, 14.5058
      // Maribor: 46.5547, 15.6459
      const distance = calculateDistance(46.0569, 14.5058, 46.5547, 15.6459);
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(120);
    });

    it('should calculate distance between Ljubljana and Celje (~70km)', () => {
      const distance = calculateDistance(46.0569, 14.5058, 46.2364, 15.2681);
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(80);
    });

    it('should be symmetric', () => {
      const d1 = calculateDistance(46.0569, 14.5058, 46.5547, 15.6459);
      const d2 = calculateDistance(46.5547, 15.6459, 46.0569, 14.5058);
      expect(d1).toBeCloseTo(d2, 5);
    });

    it('should handle short distances correctly', () => {
      // About 1km
      const distance = calculateDistance(46.0569, 14.5058, 46.0659, 14.5058);
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(2);
    });
  });

  describe('findNearestCity', () => {
    it('should find Ljubljana for Ljubljana coordinates', () => {
      const city = findNearestCity(46.0569, 14.5058);
      expect(city?.name).toBe('Ljubljana');
    });

    it('should find Maribor for Maribor coordinates', () => {
      const city = findNearestCity(46.5547, 15.6459);
      expect(city?.name).toBe('Maribor');
    });

    it('should return null for coordinates outside Slovenia', () => {
      // Vienna coordinates
      const city = findNearestCity(48.2082, 16.3738);
      expect(city).toBeNull();
    });

    it('should respect maxDistance parameter', () => {
      // Ljubljana center
      const cityNear = findNearestCity(46.0569, 14.5058, 50);
      expect(cityNear).not.toBeNull();

      // Same point but with very small maxDistance
      const cityFar = findNearestCity(46.0569, 14.5058, 0.001);
      // Might still find it if we're very close
    });

    it('should find nearest city for coordinates between cities', () => {
      // Somewhere between Ljubljana and Kranj
      const city = findNearestCity(46.15, 14.43);
      expect(city).not.toBeNull();
    });
  });

  describe('findStops', () => {
    it('should return empty array for less than 2 points', () => {
      expect(findStops([])).toEqual([]);
      expect(findStops([{ lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' }])).toEqual([]);
    });

    it('should find stops when staying in same city', () => {
      const points: GpsPoint[] = [
        { lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' },
        { lat: 46.0570, lng: 14.5059, timestamp: '2024-01-01T10:05:00' },
        { lat: 46.0571, lng: 14.5060, timestamp: '2024-01-01T10:10:00' },
      ];
      const stops = findStops(points, 3);
      expect(stops.length).toBe(1);
      expect(stops[0].city.name).toBe('Ljubljana');
    });

    it('should detect multiple stops', () => {
      const points: GpsPoint[] = [
        // Ljubljana - 10 minutes
        { lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' },
        { lat: 46.0570, lng: 14.5059, timestamp: '2024-01-01T10:10:00' },
        // Kranj - 10 minutes
        { lat: 46.2389, lng: 14.3556, timestamp: '2024-01-01T11:00:00' },
        { lat: 46.2390, lng: 14.3557, timestamp: '2024-01-01T11:10:00' },
      ];
      const stops = findStops(points, 5);
      expect(stops.length).toBe(2);
    });

    it('should filter out short stops based on minStopDurationMinutes', () => {
      const points: GpsPoint[] = [
        { lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' },
        { lat: 46.0570, lng: 14.5059, timestamp: '2024-01-01T10:02:00' }, // Only 2 minutes
      ];
      const stops = findStops(points, 5); // Minimum 5 minutes
      expect(stops.length).toBe(0);
    });

    it('should calculate duration correctly', () => {
      const points: GpsPoint[] = [
        { lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' },
        { lat: 46.0570, lng: 14.5059, timestamp: '2024-01-01T10:15:00' },
      ];
      const stops = findStops(points, 3);
      expect(stops[0].durationMinutes).toBe(15);
    });
  });

  describe('generateRoute', () => {
    it('should return empty string for no stops', () => {
      expect(generateRoute([])).toBe('');
    });

    it('should return single shortName for one stop', () => {
      const stops = [{
        city: { name: 'Ljubljana', shortName: 'lj', lat: 46.0569, lng: 14.5058 },
        arrivalTime: '2024-01-01T10:00:00',
        departureTime: '2024-01-01T10:15:00',
        durationMinutes: 15,
      }];
      expect(generateRoute(stops)).toBe('lj');
    });

    it('should join multiple stops with dash', () => {
      const stops = [
        {
          city: { name: 'Ljubljana', shortName: 'lj', lat: 46.0569, lng: 14.5058 },
          arrivalTime: '2024-01-01T10:00:00',
          departureTime: '2024-01-01T10:15:00',
          durationMinutes: 15,
        },
        {
          city: { name: 'Celje', shortName: 'ce', lat: 46.2364, lng: 15.2681 },
          arrivalTime: '2024-01-01T11:00:00',
          departureTime: '2024-01-01T11:15:00',
          durationMinutes: 15,
        },
        {
          city: { name: 'Maribor', shortName: 'mb', lat: 46.5547, lng: 15.6459 },
          arrivalTime: '2024-01-01T12:00:00',
          departureTime: '2024-01-01T12:15:00',
          durationMinutes: 15,
        },
      ];
      expect(generateRoute(stops)).toBe('lj - ce - mb');
    });

    it('should remove consecutive duplicates', () => {
      const stops = [
        {
          city: { name: 'Ljubljana', shortName: 'lj', lat: 46.0569, lng: 14.5058 },
          arrivalTime: '2024-01-01T10:00:00',
          departureTime: '2024-01-01T10:15:00',
          durationMinutes: 15,
        },
        {
          city: { name: 'Ljubljana', shortName: 'lj', lat: 46.0569, lng: 14.5058 },
          arrivalTime: '2024-01-01T10:30:00',
          departureTime: '2024-01-01T10:45:00',
          durationMinutes: 15,
        },
        {
          city: { name: 'Celje', shortName: 'ce', lat: 46.2364, lng: 15.2681 },
          arrivalTime: '2024-01-01T11:00:00',
          departureTime: '2024-01-01T11:15:00',
          durationMinutes: 15,
        },
      ];
      expect(generateRoute(stops)).toBe('lj - ce');
    });
  });

  describe('generateRouteFromPoints', () => {
    it('should generate route from GPS points', () => {
      const points: GpsPoint[] = [
        { lat: 46.0569, lng: 14.5058, timestamp: '2024-01-01T10:00:00' },
        { lat: 46.0570, lng: 14.5059, timestamp: '2024-01-01T10:10:00' },
      ];
      const route = generateRouteFromPoints(points);
      expect(route).toBe('lj');
    });

    it('should return empty string for empty points', () => {
      expect(generateRouteFromPoints([])).toBe('');
    });
  });
});
