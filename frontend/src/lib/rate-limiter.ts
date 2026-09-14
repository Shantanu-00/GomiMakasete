/**
 * In-Memory Sliding Window Rate Limiter for Next.js API Routes.
 * Protects Bedrock AI endpoints against spam, scraping, and billing exhaustion.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Stores IP -> request timestamps
const ipStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const maxWindow = 15 * 60 * 1000; // 15 mins
  for (const [ip, record] of ipStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => now - ts < maxWindow);
    if (record.timestamps.length === 0) {
      ipStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number; // Maximum allowed requests
  windowMs: number;    // Time window in milliseconds
  endpointName: string;
}

// Default security profiles for GomiMakasete
export const RATE_LIMIT_CONFIGS = {
  // Heavy vision analysis: Max 10 scans per 10 minutes per IP
  VISION_SCAN: {
    maxRequests: 10,
    windowMs: 10 * 60 * 1000,
    endpointName: 'Camera / Image Scan'
  },
  // Resident Chat: Max 25 messages per 5 minutes per IP
  CHAT: {
    maxRequests: 25,
    windowMs: 5 * 60 * 1000,
    endpointName: 'Resident Chat Q&A'
  },
  // Ambient Voice Assistant: Max 15 voice queries per 5 minutes per IP
  VOICE: {
    maxRequests: 15,
    windowMs: 5 * 60 * 1000,
    endpointName: 'Ambient Voice Assistant'
  },
  // Neighborhood schedule lookup: Max 60 requests per minute per IP
  SCHEDULE_LOOKUP: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    endpointName: 'Schedule Timetable'
  }
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  message?: string;
}

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${ip}:${config.endpointName}`;

  let record = ipStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    ipStore.set(key, record);
  }

  // Filter out timestamps older than the window
  const windowStart = now - config.windowMs;
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.ceil((oldest + config.windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetSeconds: Math.max(1, resetSeconds),
      message: `Rate limit exceeded for ${config.endpointName}. Max ${config.maxRequests} requests per ${Math.round(config.windowMs / 60000)} minutes. Please retry in ${resetSeconds}s.`
    };
  }

  // Add current request
  record.timestamps.push(now);

  const remaining = config.maxRequests - record.timestamps.length;
  const oldest = record.timestamps[0];
  const resetSeconds = Math.ceil((oldest + config.windowMs - now) / 1000);

  return {
    allowed: true,
    remaining,
    limit: config.maxRequests,
    resetSeconds: Math.max(1, resetSeconds)
  };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
