export type ShipmentStatus =
  | "created"
  | "picked_up"
  | "in_transit"
  | "at_facility"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "exception";

export interface Shipment {
  id: string;
  tracking_number: string;
  customer_name: string | null;
  customer_email: string | null;
  status: ShipmentStatus;
  current_location: string | null;
  estimated_delivery: string | null;
  ship_date: string | null;
  expected_delivery_date: string | null;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  shipment_type: string;
  carrier: string | null;
  reference_number: string | null;
  notes: string | null;
  weight: number | null;
  proof_image_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  title: string;
  description: string | null;
  city: string;
  country: string;
  occurred_at: string;
  created_at: string;
}

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  name: string;
  quantity: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  shipment_id: string;
  visitor_name: string;
  visitor_email: string;
  public_token: string;
  last_message_at: string;
  admin_unread_count: number;
  created_at: string;
}

export interface ConversationWithShipment extends Conversation {
  shipments: Pick<Shipment, "tracking_number"> | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  body: string;
  sender_type: "customer" | "admin";
  created_at: string;
  read_at: string | null;
}

export interface ShipmentDetails extends Shipment {
  tracking_events: TrackingEvent[];
  shipment_items: ShipmentItem[];
}
