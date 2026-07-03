// Sends a "courier assigned" confirmation to the n8n webhook whenever an admin
// assigns an order to a courier. n8n then delivers the message (e.g. WhatsApp/SMS)
// to the customer. Failures here are swallowed so they never block the assignment.

const COURIER_ASSIGNED_WEBHOOK = "https://n8n.srv1155688.hstgr.cloud/webhook/courier-assigned"

export interface CourierAssignedNotice {
  orderNumber: string
  courierName: string
  customerName?: string | null
  customerPhone?: string | null
  /** Override the default message text if needed. */
  message?: string
}

// Simple, decent confirmation message (Arabic — the customer's language).
export function buildAssignedMessage(orderNumber: string, courierName: string): string {
  return (
    `عميلنا العزيز 👋\n` +
    `تم إسناد طلبك رقم #${orderNumber} إلى المندوب ${courierName} للتوصيل، ` +
    `وسيتواصل معك قريبًا لتحديد الموعد المناسب.\n` +
    `شكرًا لثقتك بنا 💚`
  )
}

export async function notifyCourierAssigned(notice: CourierAssignedNotice): Promise<void> {
  try {
    const message = notice.message ?? buildAssignedMessage(notice.orderNumber, notice.courierName)
    await fetch(COURIER_ASSIGNED_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "courier-assigned",
        order_number: notice.orderNumber,
        courier_name: notice.courierName,
        customer_name: notice.customerName ?? null,
        customer_phone: notice.customerPhone ?? null,
        message,
      }),
    })
  } catch (err) {
    // Never let a notification failure break the assignment flow.
    console.warn("notifyCourierAssigned failed:", err)
  }
}
