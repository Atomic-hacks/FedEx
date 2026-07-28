import { supabaseRequest } from '../lib/supabase-rest'
import type { Conversation, ConversationWithShipment, Message } from '../types/domain'

export const MessageService = {
  async startPublicConversation(trackingNumber: string, visitorName: string, visitorEmail: string, body: string) {
    return supabaseRequest<{ id: string; public_token: string }>('rpc/start_support_conversation', {
      method: 'POST',
      body: JSON.stringify({ input_tracking_number: trackingNumber, input_visitor_name: visitorName, input_visitor_email: visitorEmail, input_body: body }),
    })
  },
  async openConversation(shipmentId: string, visitorName: string, visitorEmail: string) {
    const publicToken = crypto.randomUUID()
    const rows = await supabaseRequest<Conversation[]>('conversations', { method: 'POST', body: JSON.stringify({ shipment_id: shipmentId, visitor_name: visitorName, visitor_email: visitorEmail, public_token: publicToken }) })
    return rows[0]
  },
  async getPublicConversation(trackingNumber: string, token: string) {
    return supabaseRequest<Conversation | null>('rpc/get_public_conversation', { method: 'POST', body: JSON.stringify({ input_tracking_number: trackingNumber, input_token: token }) })
  },
  listPublicMessages(trackingNumber: string, token: string) {
    return supabaseRequest<Message[]>('rpc/get_public_messages', { method: 'POST', body: JSON.stringify({ input_tracking_number: trackingNumber, input_token: token }) })
  },
  listConversations() {
    return supabaseRequest<ConversationWithShipment[]>('conversations?select=*,shipments(tracking_number)&order=last_message_at.desc')
  },
  sendPublicMessage(trackingNumber: string, token: string, body: string) { return supabaseRequest<Message>('rpc/send_public_message', { method: 'POST', body: JSON.stringify({ input_tracking_number: trackingNumber, input_token: token, input_body: body }) }) },
  async listMessages(conversationId: string) {
    return supabaseRequest<Message[]>(`messages?select=*&conversation_id=eq.${conversationId}&order=created_at.asc`)
  },
  async send(conversationId: string, body: string, senderType: Message['sender_type']) {
    const rows = await supabaseRequest<Message[]>('messages', { method: 'POST', body: JSON.stringify({ conversation_id: conversationId, body, sender_type: senderType }) })
    await supabaseRequest<void>(`conversations?id=eq.${conversationId}`, { method: 'PATCH', body: JSON.stringify({ last_message_at: new Date().toISOString() }) })
    return rows[0]
  },
  markRead(conversationId: string) { return supabaseRequest<void>(`messages?conversation_id=eq.${conversationId}&read_at=is.null`, { method: 'PATCH', body: JSON.stringify({ read_at: new Date().toISOString() }) }) },
}
