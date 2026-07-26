/**
 * Reverse geocode coordinates to city and country using OpenStreetMap Nominatim API.
 *
 * Free, no API key required. Limited to 1 request/second (per OSM usage policy).
 * Returns { city, country } or null on failure.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ city: string | null; country: string | null } | null> {
  // Skip if coordinates are default/zero
  if (!lat && !lng) return null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          "User-Agent": "LifeTrace/1.0 (memory tracking app)",
          "Accept-Language": "en",
        },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.address) return null;

    const addr = data.address;
    const city =
      addr.city || addr.town || addr.village || addr.municipality || addr.county || null;
    const country = addr.country || null;

    return { city, country };
  } catch {
    return null;
  }
}
