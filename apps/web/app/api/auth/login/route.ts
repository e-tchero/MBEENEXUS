import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { checkRateLimit, getRateLimitIdentity, type RateLimitTier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  // Rate limit: auth tier
  const identity = getRateLimitIdentity(undefined, request.headers.get('x-forwarded-for'), null);
  const rateLimit = checkRateLimit(identity, 'auth');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    const supabaseResponse = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string) {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value);
          },
          remove(name: string) {
            request.cookies.set(name, '');
            supabaseResponse.cookies.set(name, '');
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Return response with cookies set by Supabase SSR
    const response = NextResponse.json({
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
    });

    // Copy cookies from supabaseResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Login error', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
