import { describe, it, expect } from 'vitest';
import {
  CoordinatesSchema,
  AddressSchema,
  NigerianPhoneSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  QuoteRequestSchema,
  CreateOrderRequestSchema,
  CancelOrderRequestSchema,
} from './index';

describe('CoordinatesSchema', () => {
  it('should validate valid coordinates', () => {
    const result = CoordinatesSchema.safeParse({
      latitude: 6.5244,
      longitude: 3.3792,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid latitude', () => {
    const result = CoordinatesSchema.safeParse({
      latitude: 100,
      longitude: 3.3792,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid longitude', () => {
    const result = CoordinatesSchema.safeParse({
      latitude: 6.5244,
      longitude: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe('NigerianPhoneSchema', () => {
  it('should validate valid Nigerian phone numbers', () => {
    expect(NigerianPhoneSchema.safeParse('08012345678').success).toBe(true);
    expect(NigerianPhoneSchema.safeParse('07012345678').success).toBe(true);
    expect(NigerianPhoneSchema.safeParse('09012345678').success).toBe(true);
    expect(NigerianPhoneSchema.safeParse('+2348012345678').success).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(NigerianPhoneSchema.safeParse('1234567890').success).toBe(false);
    expect(NigerianPhoneSchema.safeParse('0801234567').success).toBe(false);
    expect(NigerianPhoneSchema.safeParse('').success).toBe(false);
  });
});

describe('AddressSchema', () => {
  it('should validate valid address', () => {
    const result = AddressSchema.safeParse({
      address: '123 Main Street',
      latitude: 6.5244,
      longitude: 3.3792,
      contact_name: 'John Doe',
      contact_phone: '08012345678',
    });
    expect(result.success).toBe(true);
  });

  it('should reject address without required fields', () => {
    const result = AddressSchema.safeParse({
      address: '123 Main Street',
    });
    expect(result.success).toBe(false);
  });
});

describe('RegisterRequestSchema', () => {
  it('should validate valid registration', () => {
    const result = RegisterRequestSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'John Doe',
      role: 'customer',
    });
    expect(result.success).toBe(true);
  });

  it('should reject short password', () => {
    const result = RegisterRequestSchema.safeParse({
      email: 'test@example.com',
      password: '1234567',
      full_name: 'John Doe',
      role: 'customer',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = RegisterRequestSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
      full_name: 'John Doe',
      role: 'customer',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginRequestSchema', () => {
  it('should validate valid login', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty password', () => {
    const result = LoginRequestSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('CancelOrderRequestSchema', () => {
  it('should validate valid cancellation', () => {
    const result = CancelOrderRequestSchema.safeParse({
      reason: 'Changed my mind',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty reason', () => {
    const result = CancelOrderRequestSchema.safeParse({
      reason: '',
    });
    expect(result.success).toBe(false);
  });
});
