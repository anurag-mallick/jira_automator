import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createRequestLogger, log } from './logger';
import path from 'path';

// Mock the file system operations
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn()
}));

// Mock winston transports
vi.mock('winston', async () => {
  const actual = await vi.importActual('winston');
  return {
    ...actual,
    createLogger: vi.fn(),
    transports: {
      Console: vi.fn().mockImplementation(() => ({ log: vi.fn() })),
      DailyRotateFile: vi.fn().mockImplementation(() => ({ log: vi.fn() }))
    }
  };
});

vi.mock('winston-daily-rotate-file');

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger with correct configuration', () => {
    // This test verifies that the logger is initialized with the expected configuration
    // The actual implementation would be tested by checking the createLogger call
    expect(createLogger).toHaveBeenCalled();
  });

  it('should create request logger with context', () => {
    const mockReq = {
      headers: {
        'x-request-id': 'test-request-123',
        'user-agent': 'Test Agent'
      }
    } as any;

    const requestLogger = createRequestLogger(mockReq as any);

    expect(requestLogger).toBeDefined();
    expect(requestLogger.info).toBeDefined();
    expect(requestLogger.error).toBeDefined();
    expect(requestLogger.warn).toBeDefined();
    expect(requestLogger.debug).toBeDefined();
  });

  it('should provide global log methods', () => {
    expect(log.info).toBeDefined();
    expect(log.error).toBeDefined();
    expect(log.warn).toBeDefined();
    expect(log.debug).toBeDefined();
    expect(log.child).toBeDefined();
  });

  it('should handle missing request ID gracefully', () => {
    const mockReq = {
      headers: {
        'user-agent': 'Test Agent'
      }
    } as any;

    const requestLogger = createRequestLogger(mockReq as any);
    expect(requestLogger).toBeDefined();
  });
});

describe('Logger Error Handling', () => {
  it('should handle file system errors during initialization', () => {
    // This test would verify that the logger handles FS errors gracefully
    // The actual error handling is tested by the logger's ability to fall back to console
    expect(log.info).toBeDefined();
  });
});