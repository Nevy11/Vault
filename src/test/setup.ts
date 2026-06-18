import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto for hashPin tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm, data) => {
        return new Uint8Array(32).buffer; // Dummy hash
      }),
    },
  },
});
