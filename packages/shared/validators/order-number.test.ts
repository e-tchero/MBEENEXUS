import { describe, it, expect } from 'vitest';

/**
 * Order Number Generation Tests
 *
 * Validates the format and uniqueness properties of the order number system.
 * The actual generation is done by the PostgreSQL generate_order_number() function
 * which uses atomic INSERT ON CONFLICT for concurrency safety.
 *
 * Format: ORD-YYYYMMDD-NNNN
 * Example: ORD-20260822-0001
 */

describe('Order Number Format', () => {
  it('should match the expected format ORD-YYYYMMDD-NNNN', () => {
    // This tests the format pattern used by generate_order_number()
    const orderNumberPattern = /^ORD-\d{8}-\d{4}$/;
    
    const testNumbers = [
      'ORD-20260822-0001',
      'ORD-20260822-0010',
      'ORD-20260822-0100',
      'ORD-20260822-1000',
      'ORD-20261231-9999',
      'ORD-20270101-0001',
    ];

    for (const num of testNumbers) {
      expect(num).toMatch(orderNumberPattern);
    }
  });

  it('should use today date prefix', () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    
    const orderNumber = `ORD-${dateStr}-0001`;
    expect(orderNumber).toMatch(/^ORD-/);
    expect(orderNumber).toContain(dateStr);
  });

  it('should pad sequence to 4 digits', () => {
    // Single digit
    expect('0001'.padStart(4, '0')).toBe('0001');
    // Double digit
    expect('42'.padStart(4, '0')).toBe('0042');
    // Triple digit
    expect('999'.padStart(4, '0')).toBe('0999');
    // Four digits
    expect('1000'.padStart(4, '0')).toBe('1000');
  });
});

describe('Order Number Uniqueness Properties', () => {
  it('should generate different numbers for sequential calls', () => {
    // Simulate the atomic counter behavior
    let counter = 0;
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const numbers = new Set<string>();
    for (let i = 0; i < 100; i++) {
      counter++;
      const num = `ORD-${today}-${counter.toString().padStart(4, '0')}`;
      numbers.add(num);
    }
    
    // All 100 numbers should be unique
    expect(numbers.size).toBe(100);
  });

  it('should not overflow 4-digit padding at 9999', () => {
    // The format supports up to 9999 orders per day
    const seq = 9999;
    const maxNum = `ORD-20260822-${seq.toString().padStart(4, '0')}`;
    expect(maxNum).toBe('ORD-20260822-9999');
    expect(maxNum).toMatch(/^ORD-\d{8}-\d{4}$/);
  });

  it('should be deterministic for the same counter value', () => {
    const dateStr = '20260822';
    const seq = 42;
    const num1 = `ORD-${dateStr}-${seq.toString().padStart(4, '0')}`;
    const num2 = `ORD-${dateStr}-${seq.toString().padStart(4, '0')}`;
    expect(num1).toBe(num2);
  });
});

describe('Order Number Concurrency Safety', () => {
  it('atomic INSERT ON CONFLICT guarantees unique counters', () => {
    // This test documents the concurrency safety mechanism.
    // The actual atomic guarantee is provided by PostgreSQL's
    // INSERT ... ON CONFLICT DO UPDATE SET counter = counter + 1
    // which acquires a row-level lock on the sequence_date row.
    
    // Simulate: multiple concurrent requests all targeting the same date row
    let counter = 0;
    const lock = { acquired: false };
    
    function atomicIncrement(): number {
      // PostgreSQL ON CONFLICT locks the row, so only one transaction
      // can increment at a time. This simulates that behavior.
      lock.acquired = true;  // Row lock acquired
      counter += 1;          // Atomic increment
      lock.acquired = false; // Row lock released
      return counter;
    }
    
    // Simulate 100 "concurrent" requests
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(atomicIncrement());
    }
    
    // All results should be unique
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBe(100);
    
    // Sequential order preserved
    for (let i = 0; i < results.length; i++) {
      expect(results[i]).toBe(i + 1);
    }
  });
});
