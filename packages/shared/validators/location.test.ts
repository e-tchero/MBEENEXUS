import { describe, it, expect } from 'vitest';
import { UpdateLocationRequestSchema } from './index';

describe('Location Validation (Phase 2)', () => {
  describe('UpdateLocationRequestSchema', () => {
    it('accepts valid coordinates', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 9.0579,
        longitude: 7.4951,
      });
      expect(result.success).toBe(true);
    });

    it('accepts coordinates with optional fields', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 9.0579,
        longitude: 7.4951,
        heading: 180,
        speed: 45.5,
        accuracy: 10.0,
      });
      expect(result.success).toBe(true);
    });

    it('rejects latitude > 90', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 91,
        longitude: 7.4951,
      });
      expect(result.success).toBe(false);
    });

    it('rejects latitude < -90', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: -91,
        longitude: 7.4951,
      });
      expect(result.success).toBe(false);
    });

    it('rejects longitude > 180', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 9.0579,
        longitude: 181,
      });
      expect(result.success).toBe(false);
    });

    it('rejects longitude < -180', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 9.0579,
        longitude: -181,
      });
      expect(result.success).toBe(false);
    });

    it('accepts heading at boundaries', () => {
      expect(UpdateLocationRequestSchema.safeParse({ latitude: 0, longitude: 0, heading: 0 }).success).toBe(true);
      expect(UpdateLocationRequestSchema.safeParse({ latitude: 0, longitude: 0, heading: 360 }).success).toBe(true);
    });

    it('rejects heading > 360', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 0,
        longitude: 0,
        heading: 361,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative speed', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 0,
        longitude: 0,
        speed: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects speed > 200', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 0,
        longitude: 0,
        speed: 201,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative accuracy', () => {
      const result = UpdateLocationRequestSchema.safeParse({
        latitude: 0,
        longitude: 0,
        accuracy: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty payload', () => {
      const result = UpdateLocationRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('Haversine Distance Calculation', () => {
    // These test the conceptual distance calculation
    // The actual implementation is in rider-location.service.ts

    it('Abuja city center to Abuja airport is approximately 30km', () => {
      // Abuja city center: 9.0579, 7.4951
      // Abuja airport: 9.0065, 7.2634
      // Approximate distance: ~30km
      const R = 6371000;
      const lat1 = (9.0579 * Math.PI) / 180;
      const lat2 = (9.0065 * Math.PI) / 180;
      const dLat = ((9.0065 - 9.0579) * Math.PI) / 180;
      const dLon = ((7.2634 - 7.4951) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      expect(distance).toBeGreaterThan(20000); // > 20km
      expect(distance).toBeLessThan(40000);   // < 40km
    });

    it('same point has zero distance', () => {
      const R = 6371000;
      const lat1 = (9.0579 * Math.PI) / 180;
      const dLat = 0;
      const dLon = 0;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat1) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      expect(distance).toBe(0);
    });
  });
});
