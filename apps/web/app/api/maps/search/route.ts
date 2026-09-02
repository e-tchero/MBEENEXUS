import { NextRequest, NextResponse } from 'next/server';
import { getMapsProvider } from '@/lib/maps';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const provider = getMapsProvider();
    const results = await provider.searchAddresses(query.trim());

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Address search failed:', error);
    return NextResponse.json(
      { error: 'Address search failed' },
      { status: 500 }
    );
  }
}
