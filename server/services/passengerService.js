/* ==============================================================================
   BusTrack Pro — Passenger Experience & Pilot Service
   Pilot Zone: Universidad Fidélitas (Campus San Pedro) & Montes de Oca
   ============================================================================== */

import { db } from '../database/db.js';

export const FIDELITAS_PILOT_STOPS = [
  {
    id: 'stop-fidelitas',
    name: 'Entrada Principal U Fidélitas',
    subtext: 'Santa Marta de Montes de Oca — Frente al Campus',
    isPrimary: true,
    lat: 9.9392,
    lon: -84.0321,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-vargas-araya',
    name: 'Parada Barrio Vargas Araya',
    subtext: 'Paso universitario y residencial contiguo a Lourdes',
    isPrimary: false,
    lat: 9.9374,
    lon: -84.0382,
    routes: ['Santa Marta — Vargas Araya — Lourdes', 'Interlínea Guadalupe — San Pedro'],
  },
  {
    id: 'stop-lourdes',
    name: 'Parada Súper Lourdes / Colegio Calasanz',
    subtext: 'Salida de Lourdes hacia San Pedro centro',
    isPrimary: false,
    lat: 9.9362,
    lon: -84.0441,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Vargas Araya — Lourdes'],
  },
  {
    id: 'stop-san-pedro',
    name: 'Parada Muñoz & Nanne / Plaza del Sol',
    subtext: 'San Pedro Centro — Comercio y transbordos',
    isPrimary: false,
    lat: 9.9338,
    lon: -84.0535,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Sabanilla — Betania — UCR', 'Interlínea'],
  },
  {
    id: 'stop-mall-sp',
    name: 'Parada Mall San Pedro / Hispanidad',
    subtext: 'Rotonda de la Bandera / Los Yoses',
    isPrimary: false,
    lat: 9.9341,
    lon: -84.0620,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes', 'Sabanilla — San José'],
  },
  {
    id: 'stop-sanjose',
    name: 'Terminal San José — Cuesta de Moras',
    subtext: 'Avenida Central / Cuesta de Moras',
    isPrimary: false,
    lat: 9.9332,
    lon: -84.0768,
    routes: ['Granadilla — Fidélitas — San Pedro', 'Santa Marta — Lourdes'],
  },
];

const PILOT_LINES = [
  {
    routeId: 'GRA-FID',
    name: 'Granadilla por U Fidélitas',
    destination: 'San José por San Pedro',
    operator: 'Autotransportes Cesmag',
    color: '#5b6ef5',
    baseMinutes: 4,
  },
  {
    routeId: 'MAR-VAR',
    name: 'Santa Marta — Vargas Araya',
    destination: 'San Pedro por Lourdes',
    operator: 'Autotransportes Cesmag',
    color: '#2aa3c4',
    baseMinutes: 11,
  },
  {
    routeId: 'INT-GUA',
    name: 'Interlínea Guadalupe — Curridabat',
    destination: 'Paso por San Pedro / Calasanz',
    operator: 'Consorcio Interlíneas Este',
    color: '#2bb885',
    baseMinutes: 17,
  },
  {
    routeId: 'SAB-UCR',
    name: 'Sabanilla — Betania — UCR',
    destination: 'San José por Outlet Mall',
    operator: 'Autotransportes Cesmag',
    color: '#7c4ddb',
    baseMinutes: 24,
  },
];

export class PassengerService {
  static getPilotStops() {
    return db.stops.filter(s => s.id && s.id.startsWith('stop-'));
  }

  static getStopById(stopId) {
    return db.stops.find(s => s.id === stopId) || db.stops[0];
  }

  static getStopArrivals(stopId = 'stop-fidelitas') {
    const currentStop = this.getStopById(stopId);
    const buses = db.getAllBuses();

    // Map live active buses into pilot arrival cards
    const arrivals = PILOT_LINES.map((line, index) => {
      const matchedBus = buses[index % buses.length] || buses[0];
      const isDelayed = matchedBus.status === 'delayed';

      // Calculate countdown dynamically based on bus progression and live speed
      const progressFactor = matchedBus._t ? (1 - matchedBus._t) : 0.5;
      const computedMinutes = Math.max(1, Math.round(line.baseMinutes + (progressFactor * 6) + (isDelayed ? matchedBus.delay : 0)));
      const computedDistanceMeters = Math.max(250, Math.round(computedMinutes * 380));

      const occupancyPct = Math.min(100, Math.max(10, matchedBus.passengers ? Math.round((matchedBus.passengers / matchedBus.capacity) * 100) : 40));

      let occupancyLevel = 'baja';
      let occupancyLabel = 'Asientos disponibles';
      if (occupancyPct > 80) {
        occupancyLevel = 'alta';
        occupancyLabel = 'Casi lleno / Solo de pie';
      } else if (occupancyPct > 55) {
        occupancyLevel = 'media';
        occupancyLabel = 'Espacio de pie disponible';
      }

      return {
        id: `arrival-${line.routeId}-${matchedBus.id}`,
        busId: matchedBus.id,
        plate: matchedBus.plate,
        routeId: line.routeId,
        routeName: line.name,
        destination: line.destination,
        operator: line.operator,
        color: line.color,
        status: matchedBus.status,
        isDelayed,
        delayMinutes: matchedBus.delay || 0,
        etaMinutes: computedMinutes,
        distanceMeters: computedDistanceMeters,
        distanceFormatted: computedDistanceMeters >= 1000
          ? `${(computedDistanceMeters / 1000).toFixed(1)} km`
          : `${computedDistanceMeters} m`,
        speedKmh: matchedBus.speed || 38,
        occupancyPercent: occupancyPct,
        occupancyLevel,
        occupancyLabel,
        wheelchairAccessible: true,
        nextBusInMinutes: computedMinutes + 14 + (index * 3),
        targetStop: {
          id: currentStop.id,
          name: currentStop.name,
        },
        driverName: matchedBus.driver ? matchedBus.driver.name : 'Conductor asignado',
        driverRating: matchedBus.driver ? matchedBus.driver.rating : 4.9,
      };
    });

    // Sort by shortest ETA
    arrivals.sort((a, b) => a.etaMinutes - b.etaMinutes);

    return {
      currentStop,
      generatedAt: new Date().toISOString(),
      pilotZone: 'Universidad Fidélitas — Sede San Pedro (Montes de Oca)',
      totalIncomingBuses: arrivals.length,
      arrivals,
    };
  }
}
