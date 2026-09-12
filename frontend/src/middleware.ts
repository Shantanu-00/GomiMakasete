import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Max Payload Size Protection (5MB limit)
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
    return NextResponse.json(
      {
        error: 'Payload Too Large',
        message: 'Maximum allowed image upload size is 5MB to prevent memory and model abuse.'
      },
      { status: 413 }
    );
  }

  const clientIp = getClientIp(request);

  // 2. Rate Limit for Vision Scan (/api/detect)
  if (pathname.startsWith('/api/detect')) {
    const rateCheck = checkRateLimit(clientIp, RATE_LIMIT_CONFIGS.VISION_SCAN);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: rateCheck.message,
          retryAfterSeconds: rateCheck.resetSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateCheck.resetSeconds)
          }
        }
      );
    }
  }

  // 3. Rate Limit for Resident Chat (/api/chat)
  if (pathname.startsWith('/api/chat')) {
    const rateCheck = checkRateLimit(clientIp, RATE_LIMIT_CONFIGS.CHAT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: rateCheck.message,
          retryAfterSeconds: rateCheck.resetSeconds
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateCheck.resetSeconds)
          }
        }
      );
    }
  }

  return NextResponse.next();
}

// Only match API routes to avoid overhead on static assets
export const config = {
  matcher: ['/api/:path*']
};
