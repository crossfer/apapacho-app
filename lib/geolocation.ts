// -----------------------------------------------------------------------------
// Location capture for staff status changes.
//
// Called before each service_updates insert. Always resolves — if the user
// denies permission or the browser has no geolocation, we still return a
// timestamp and mark `denied: true`.
// -----------------------------------------------------------------------------

export interface LocationData {
  latitude?: number
  longitude?: number
  accuracy?: number
  timestamp: Date
  denied: boolean
}

export async function captureLocation(): Promise<LocationData> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ denied: true, timestamp: new Date() })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(),
          denied: false,
        }),
      () => resolve({ denied: true, timestamp: new Date() }),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  })
}
