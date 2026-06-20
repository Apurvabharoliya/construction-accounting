/**
 * Generate a random short ID for client-side row identification
 */
export function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * Calculate the total for a transaction entry based on its type and items.
 * For payment/receipt entries, returns amount_paid/amount_received.
 * For purchase/sale entries, sums up item amounts.
 */
export function calcEntryTotal(entry: {
  payment_status: 'unpaid' | 'paid'
  amount_paid?: number
  amount_received?: number
  items: Array<{ amount: number; quantity: number; rate: number }>
}): number {
  if (entry.payment_status === 'paid') {
    return entry.amount_paid ?? entry.amount_received ?? 0
  }
  return entry.items.reduce((sum, item) => {
    const amt = item.amount > 0 ? item.amount : (item.quantity * item.rate)
    return sum + amt
  }, 0)
}
