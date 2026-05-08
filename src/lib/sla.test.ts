import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateSlaBreachTime } from './sla';
import { prisma } from './prisma';

vi.mock('./prisma', () => ({
  prisma: {
    sLAPolicy: {
      findUnique: vi.fn(),
    },
  },
}));

describe('calculateSlaBreachTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if no policy is found', async () => {
    (prisma.sLAPolicy.findUnique as any).mockResolvedValue(null);
    const result = await calculateSlaBreachTime('P2');
    expect(result).toBeNull();
  });

  it('should return a date in the future if policy is found', async () => {
    const mockPolicy = { priority: 'P0', responseTimeMins: 60 };
    (prisma.sLAPolicy.findUnique as any).mockResolvedValue(mockPolicy);
    
    const now = new Date();
    const result = await calculateSlaBreachTime('P0');
    
    expect(result).toBeInstanceOf(Date);
    if (result) {
      const diffMins = (result.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMins).toBeGreaterThanOrEqual(59);
      expect(diffMins).toBeLessThanOrEqual(61);
    }
  });

  it('should return null on database error', async () => {
    (prisma.sLAPolicy.findUnique as any).mockRejectedValue(new Error('DB Error'));
    const result = await calculateSlaBreachTime('P1');
    expect(result).toBeNull();
  });
});
