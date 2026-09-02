import { NextRequest, NextResponse } from 'next/server';
import { getMapsProvider } from '@/lib/maps';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }

    const provider = getMapsProvider();
    const result = await provider.reverseGeocode(lat, lng);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return NextResponse.json(
      { error: 'Reverse geocoding failed' },
      { status: 500 }
    );
  }
}
