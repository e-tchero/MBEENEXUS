import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1).max(200).optional(),
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
    const { email, password, fullName } = SignupSchema.parse(body);

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // If email confirmation is required, data.user will exist but data.session will be null
    // If auto-confirm is enabled, both user and session will exist
    return NextResponse.json({
      data: {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
        } : null,
        session: data.session ? true : false,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Signup error', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
