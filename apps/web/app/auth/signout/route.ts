import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
  
  // Clear auth cookies
  response.cookies.set('sb-access-token', '', {
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('sb-refresh-token', '', {
    path: '/',
    maxAge: 0,
  });

  return response;
}
