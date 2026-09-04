import { ShipmentService } from "./ShipmentService";

const PREFIXES = ["FDX", "TRK", "EXP"];

export const TrackingService = {
  generateNumber(
    prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)],
  ) {
    const bytes = crypto.getRandomValues(new Uint32Array(2));
    const digits = `${bytes[0]}${bytes[1]}`
      .replace(/\D/g, "")
      .slice(0, 12)
      .padEnd(12, "0");
    return `${prefix}${digits}`;
  },
  getShipment(trackingNumber: string) {
    return ShipmentService.byTrackingNumber(
      trackingNumber.trim().toUpperCase(),
    );
  },
};
