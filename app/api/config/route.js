import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    googleMapsKey: process.env.GOOGLE_MAPS_KEY || '',
  });
}
