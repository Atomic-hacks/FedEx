export type EventStatus = 'shipment_created' | 'picked_up' | 'arrived_at_facility' | 'departed_facility' | 'in_transit' | 'customs_clearance' | 'customs_hold' | 'flight_departed' | 'flight_arrived' | 'processing' | 'delayed' | 'exception' | 'address_issue' | 'weather_delay' | 'out_for_delivery' | 'delivery_attempted' | 'delivered' | 'held_for_pickup' | 'returned_to_sender' | 'delivery_rescheduled'

export const eventStatusLabels: Record<EventStatus, string> = {
  shipment_created: 'Shipment Created', picked_up: 'Package Picked Up', arrived_at_facility: 'Arrived at Facility', departed_facility: 'Departed Facility', in_transit: 'In Transit', customs_clearance: 'Customs Clearance', customs_hold: 'Customs Hold', flight_departed: 'Flight Departed', flight_arrived: 'Flight Arrived', processing: 'Processing at Facility', delayed: 'Shipment Delayed', exception: 'Delivery Exception', address_issue: 'Address Issue', weather_delay: 'Weather Delay', out_for_delivery: 'Out for Delivery', delivery_attempted: 'Delivery Attempted', delivered: 'Delivered', held_for_pickup: 'Held for Pickup', returned_to_sender: 'Returned to Sender', delivery_rescheduled: 'Delivery Rescheduled',
}

const templates: Record<EventStatus, (city: string, country: string, facility: string) => string> = {
  shipment_created: (city, country) => `Shipping information was received in ${city}, ${country}.`,
  picked_up: (city, country) => `The shipment was collected by the courier in ${city}, ${country}.`,
  arrived_at_facility: (_city, _country, facility) => `The shipment has arrived at the distribution center [${facility || 'LOCAL-INT'}].`,
  departed_facility: (_city, _country, facility) => `The shipment departed from the sorting facility [${facility || 'LOCAL-INT'}] and is currently in transit.`,
  in_transit: (city, country) => `The shipment is moving through our network near ${city}, ${country}.`,
  customs_clearance: (_city, country) => `Customs clearance completed successfully in ${country}.`,
  customs_hold: (_city, country) => `The shipment is awaiting customs review in ${country}.`,
  flight_departed: (city) => `The shipment departed by air from ${city}.`,
  flight_arrived: (city) => `The shipment arrived by air in ${city}.`,
  processing: (_city, _country, facility) => `The shipment is being processed at [${facility || 'LOCAL-INT'}].`,
  delayed: (city) => `A delivery delay was recorded near ${city}. Our team is working to keep the shipment moving.`,
  exception: (city) => `A delivery exception was recorded in ${city}. Further updates will be provided shortly.`,
  address_issue: (city) => `We need additional address information to complete delivery in ${city}.`,
  weather_delay: (city) => `The shipment is delayed due to severe weather conditions near ${city}.`,
  out_for_delivery: () => 'The shipment has been dispatched for final delivery.',
  delivery_attempted: (city) => `A delivery was attempted in ${city}. Please check the delivery instructions.`,
  delivered: () => 'The shipment has been successfully delivered.',
  held_for_pickup: (_city, _country, facility) => `The shipment is available for pickup at [${facility || 'LOCAL-INT'}].`,
  returned_to_sender: () => 'The shipment is being returned to the sender.',
  delivery_rescheduled: () => 'Delivery has been rescheduled. Updated delivery details will follow.',
}

export function createEventDescription(status: EventStatus, city: string, country: string, facility: string, note?: string) {
  return note?.trim() || templates[status](city, country, facility)
}
