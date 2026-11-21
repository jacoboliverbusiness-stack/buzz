/**
 * State geography used for distance and region preferences. Distances are computed
 * between approximate population centres of states, so they are labelled "about"
 * in the UI — good enough to rank "close to home", never presented as exact.
 */
export const STATE_CENTER: Record<string, [number, number]> = {
  AL: [32.8, -86.8], AK: [61.4, -150.0], AZ: [33.6, -112.0], AR: [34.8, -92.4], CA: [35.5, -119.4],
  CO: [39.6, -105.0], CT: [41.6, -72.7], DE: [39.4, -75.6], DC: [38.9, -77.0], FL: [27.8, -81.6],
  GA: [33.4, -84.0], HI: [21.3, -157.8], ID: [43.6, -116.0], IL: [41.3, -88.4], IN: [39.8, -86.3],
  IA: [41.9, -92.9], KS: [38.5, -97.2], KY: [37.8, -85.3], LA: [30.7, -91.4], ME: [44.3, -69.8],
  MD: [39.1, -76.8], MA: [42.3, -71.4], MI: [42.7, -84.2], MN: [45.1, -93.4], MS: [32.6, -89.7],
  MO: [38.4, -92.2], MT: [46.4, -110.6], NE: [41.1, -96.8], NV: [36.6, -115.5], NH: [43.0, -71.5],
  NJ: [40.4, -74.4], NM: [35.0, -106.4], NY: [41.5, -74.6], NC: [35.6, -79.4], ND: [47.4, -98.9],
  OH: [40.5, -82.7], OK: [35.6, -96.9], OR: [44.7, -122.6], PA: [40.5, -76.9], RI: [41.8, -71.4],
  SC: [34.0, -81.0], SD: [43.9, -98.0], TN: [35.8, -86.4], TX: [31.0, -97.4], UT: [40.5, -111.8],
  VT: [44.2, -72.8], VA: [37.8, -77.8], WA: [47.3, -121.9], WV: [38.6, -80.9], WI: [43.7, -89.0],
  WY: [42.7, -107.0],
};

export const REGIONS: Record<string, string[]> = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  "Mid-Atlantic": ["DE", "DC", "MD", "VA", "WV"],
  Southeast: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  South: ["AR", "LA", "OK", "TX"],
  Mountain: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY"],
  "West Coast": ["CA", "OR", "WA", "AK", "HI"],
};

export function regionOf(state: string): string | undefined {
  return Object.entries(REGIONS).find(([, s]) => s.includes(state))?.[0];
}

export function milesBetweenStates(a: string, b: string): number | undefined {
  const p = STATE_CENTER[a];
  const q = STATE_CENTER[b];
  if (!p || !q) return undefined;
  if (a === b) return 0;
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(q[0] - p[0]);
  const dLon = toRad(q[1] - p[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(p[0])) * Math.cos(toRad(q[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
