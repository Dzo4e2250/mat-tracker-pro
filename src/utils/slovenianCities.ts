/**
 * @file slovenianCities.ts
 * @description Slovenska mesta s koordinatami za reverse geocoding
 */

export interface City {
  name: string;
  shortName: string; // kratice za relacije (mb, lj, ce, ...)
  lat: number;
  lng: number;
}

// Glavna slovenska mesta s koordinatami
export const SLOVENIAN_CITIES: City[] = [
  // Večja mesta
  { name: 'Ljubljana', shortName: 'lj', lat: 46.0569, lng: 14.5058 },
  { name: 'Maribor', shortName: 'mb', lat: 46.5547, lng: 15.6459 },
  { name: 'Celje', shortName: 'ce', lat: 46.2364, lng: 15.2681 },
  { name: 'Kranj', shortName: 'kr', lat: 46.2389, lng: 14.3556 },
  { name: 'Koper', shortName: 'kp', lat: 45.5469, lng: 13.7294 },
  { name: 'Velenje', shortName: 've', lat: 46.3592, lng: 15.1103 },
  { name: 'Novo mesto', shortName: 'nm', lat: 45.8061, lng: 15.1614 },
  { name: 'Ptuj', shortName: 'pt', lat: 46.4200, lng: 15.8700 },
  { name: 'Murska Sobota', shortName: 'ms', lat: 46.6625, lng: 16.1664 },
  { name: 'Nova Gorica', shortName: 'ng', lat: 45.9558, lng: 13.6481 },

  // Srednje velika mesta
  { name: 'Domžale', shortName: 'do', lat: 46.1375, lng: 14.5936 },
  { name: 'Škofja Loka', shortName: 'sl', lat: 46.1656, lng: 14.3064 },
  { name: 'Kamnik', shortName: 'ka', lat: 46.2256, lng: 14.6119 },
  { name: 'Jesenice', shortName: 'je', lat: 46.4364, lng: 14.0528 },
  { name: 'Trbovlje', shortName: 'tr', lat: 46.1531, lng: 15.0531 },
  { name: 'Kočevje', shortName: 'ko', lat: 45.6428, lng: 14.8631 },
  { name: 'Postojna', shortName: 'po', lat: 45.7744, lng: 14.2153 },
  { name: 'Izola', shortName: 'iz', lat: 45.5386, lng: 13.6600 },
  { name: 'Piran', shortName: 'pi', lat: 45.5283, lng: 13.5681 },
  { name: 'Portorož', shortName: 'pz', lat: 45.5100, lng: 13.5900 },
  { name: 'Sežana', shortName: 'se', lat: 45.7078, lng: 13.8742 },
  { name: 'Ajdovščina', shortName: 'aj', lat: 45.8872, lng: 13.9094 },
  { name: 'Idrija', shortName: 'id', lat: 46.0033, lng: 14.0281 },
  { name: 'Tolmin', shortName: 'to', lat: 46.1833, lng: 13.7333 },
  { name: 'Bled', shortName: 'bl', lat: 46.3683, lng: 14.1147 },
  { name: 'Radovljica', shortName: 'ra', lat: 46.3444, lng: 14.1747 },
  { name: 'Krško', shortName: 'kk', lat: 45.9600, lng: 15.4922 },
  { name: 'Brežice', shortName: 'br', lat: 45.9069, lng: 15.5911 },
  { name: 'Sevnica', shortName: 'sv', lat: 46.0083, lng: 15.3028 },
  { name: 'Trebnje', shortName: 'tb', lat: 45.9081, lng: 15.0117 },
  { name: 'Črnomelj', shortName: 'cm', lat: 45.5714, lng: 15.1892 },
  { name: 'Metlika', shortName: 'me', lat: 45.6478, lng: 15.3131 },
  { name: 'Laško', shortName: 'la', lat: 46.1542, lng: 15.2356 },
  { name: 'Žalec', shortName: 'za', lat: 46.2522, lng: 15.1647 },
  { name: 'Slovenske Konjice', shortName: 'sk', lat: 46.3367, lng: 15.4258 },
  { name: 'Šentjur', shortName: 'sj', lat: 46.2153, lng: 15.3947 },
  { name: 'Rogaška Slatina', shortName: 'rs', lat: 46.2375, lng: 15.6394 },
  { name: 'Šmarje pri Jelšah', shortName: 'sm', lat: 46.2286, lng: 15.5192 },
  { name: 'Slovenska Bistrica', shortName: 'sb', lat: 46.3928, lng: 15.5731 },
  { name: 'Ruše', shortName: 'ru', lat: 46.5389, lng: 15.5156 },
  { name: 'Lenart', shortName: 'le', lat: 46.5750, lng: 15.8306 },
  { name: 'Gornja Radgona', shortName: 'gr', lat: 46.6756, lng: 15.9919 },
  { name: 'Ljutomer', shortName: 'lm', lat: 46.5189, lng: 16.1972 },
  { name: 'Ormož', shortName: 'or', lat: 46.4078, lng: 16.1536 },
  { name: 'Lendava', shortName: 'ld', lat: 46.5611, lng: 16.4522 },
  { name: 'Slovenj Gradec', shortName: 'sg', lat: 46.5103, lng: 15.0806 },
  { name: 'Ravne na Koroškem', shortName: 'rk', lat: 46.5444, lng: 14.9686 },
  { name: 'Dravograd', shortName: 'dg', lat: 46.5903, lng: 15.0244 },
  { name: 'Radlje ob Dravi', shortName: 'rd', lat: 46.6142, lng: 15.2264 },
  { name: 'Muta', shortName: 'mu', lat: 46.6117, lng: 15.1656 },

  // Manjša mesta in kraji
  { name: 'Logatec', shortName: 'lg', lat: 45.9158, lng: 14.2281 },
  { name: 'Vrhnika', shortName: 'vh', lat: 45.9617, lng: 14.2972 },
  { name: 'Grosuplje', shortName: 'gs', lat: 45.9550, lng: 14.6589 },
  { name: 'Litija', shortName: 'li', lat: 46.0575, lng: 14.8283 },
  { name: 'Zagorje ob Savi', shortName: 'zs', lat: 46.1333, lng: 14.9975 },
  { name: 'Hrastnik', shortName: 'hr', lat: 46.1436, lng: 15.0833 },
  { name: 'Mengeš', shortName: 'mg', lat: 46.1658, lng: 14.5719 },
  { name: 'Medvode', shortName: 'md', lat: 46.1219, lng: 14.4128 },
  { name: 'Škofljica', shortName: 'sf', lat: 45.9833, lng: 14.5750 },
  { name: 'Ivančna Gorica', shortName: 'ig', lat: 45.9389, lng: 14.8044 },
  { name: 'Ribnica', shortName: 'ri', lat: 45.7386, lng: 14.7264 },
  { name: 'Sodražica', shortName: 'sd', lat: 45.7611, lng: 14.6350 },
  { name: 'Loška dolina', shortName: 'lod', lat: 45.7083, lng: 14.5000 },
  { name: 'Ilirska Bistrica', shortName: 'ib', lat: 45.5667, lng: 14.2500 },
  { name: 'Pivka', shortName: 'pv', lat: 45.6833, lng: 14.2000 },
  { name: 'Vipava', shortName: 'vi', lat: 45.8456, lng: 13.9617 },
  { name: 'Bovec', shortName: 'bo', lat: 46.3381, lng: 13.5522 },
  { name: 'Kobarid', shortName: 'kb', lat: 46.2481, lng: 13.5786 },
  { name: 'Cerkno', shortName: 'ck', lat: 46.1283, lng: 13.9892 },
  { name: 'Železniki', shortName: 'zl', lat: 46.2239, lng: 14.1675 },
  { name: 'Tržič', shortName: 'tz', lat: 46.3636, lng: 14.3094 },
  { name: 'Naklo', shortName: 'na', lat: 46.2722, lng: 14.3175 },
  { name: 'Preddvor', shortName: 'pd', lat: 46.3014, lng: 14.4222 },
  { name: 'Mojstrana', shortName: 'mj', lat: 46.4742, lng: 13.9461 },
  { name: 'Kranjska Gora', shortName: 'kg', lat: 46.4847, lng: 13.7856 },
  { name: 'Bohinjska Bistrica', shortName: 'bb', lat: 46.2728, lng: 13.9528 },
  { name: 'Puconci', shortName: 'pu', lat: 46.7053, lng: 16.1597 },
  { name: 'Slivnica pri Mariboru', shortName: 'sliv', lat: 46.4917, lng: 15.6167 },
];

/**
 * Izračuna razdaljo med dvema točkama (Haversine formula)
 * @returns razdalja v km
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Polmer Zemlje v km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Najde najbližje mesto za dane koordinate
 * @param lat - Latitude
 * @param lng - Longitude
 * @param maxDistance - Maksimalna razdalja v km (default 15km)
 * @returns Najbližje mesto ali null če ni v dosegu
 */
export function findNearestCity(lat: number, lng: number, maxDistance: number = 15): City | null {
  let nearest: City | null = null;
  let minDistance = Infinity;

  for (const city of SLOVENIAN_CITIES) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}

/**
 * Zazna postanke iz GPS točk (kjer se je uporabnik ustavil)
 * Postanek = lokacija kjer je bil uporabnik vsaj 5 minut
 */
export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Stop {
  city: City;
  arrivalTime: string;
  departureTime: string;
  durationMinutes: number;
}

/**
 * Analizira GPS točke in najde postanke (mesta kjer se je uporabnik ustavil)
 */
export function findStops(points: GpsPoint[], minStopDurationMinutes: number = 3): Stop[] {
  if (points.length < 2) return [];

  const stops: Stop[] = [];
  let currentCity: City | null = null;
  let cityEntryTime: string | null = null;
  let lastPointTime: string | null = null;

  for (const point of points) {
    const city = findNearestCity(point.lat, point.lng, 10);

    if (city) {
      if (!currentCity || currentCity.shortName !== city.shortName) {
        // Prišli smo v novo mesto
        if (currentCity && cityEntryTime && lastPointTime) {
          // Shrani prejšnji postanek
          const duration = (new Date(lastPointTime).getTime() - new Date(cityEntryTime).getTime()) / 60000;
          if (duration >= minStopDurationMinutes) {
            stops.push({
              city: currentCity,
              arrivalTime: cityEntryTime,
              departureTime: lastPointTime,
              durationMinutes: Math.round(duration),
            });
          }
        }
        currentCity = city;
        cityEntryTime = point.timestamp;
      }
      lastPointTime = point.timestamp;
    }
  }

  // Dodaj zadnji postanek
  if (currentCity && cityEntryTime && lastPointTime) {
    const duration = (new Date(lastPointTime).getTime() - new Date(cityEntryTime).getTime()) / 60000;
    if (duration >= minStopDurationMinutes) {
      stops.push({
        city: currentCity,
        arrivalTime: cityEntryTime,
        departureTime: lastPointTime,
        durationMinutes: Math.round(duration),
      });
    }
  }

  return stops;
}

/**
 * Generira relacijo iz postankov
 * npr. "mb - ce - lj - ce - mb"
 */
export function generateRoute(stops: Stop[]): string {
  if (stops.length === 0) return '';
  if (stops.length === 1) return stops[0].city.shortName;

  // Odstrani zaporedne duplikate
  const uniqueStops: Stop[] = [];
  for (const stop of stops) {
    if (uniqueStops.length === 0 || uniqueStops[uniqueStops.length - 1].city.shortName !== stop.city.shortName) {
      uniqueStops.push(stop);
    }
  }

  return uniqueStops.map(s => s.city.shortName).join(' - ');
}

/**
 * Generira relacijo direktno iz GPS točk
 */
export function generateRouteFromPoints(points: GpsPoint[]): string {
  const stops = findStops(points);
  return generateRoute(stops);
}
