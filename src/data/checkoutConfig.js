// Shop rules for the bag and checkout, in one place.
// The database has its OWN copy of the delivery fee (public.delivery_fee_inr) and of the limits:
// the database is the one that is trusted. These numbers only drive what the page shows and checks first.

export const DELIVERY_FEE_INR = 99 // flat fee on every order
export const MAX_QUANTITY_PER_LINE = 10 // pairs of the same shoe + colour + size
export const MAX_CART_LINES = 20 // different shoe + colour + size combinations in one bag

// Online choices are simulations; no payment gateway or credentials are used.
export const PAYMENT_METHODS = [
  {
    id: 'cod',
    label: 'Cash on Delivery (COD)',
    description: 'Pay in cash when your order arrives.',
    simulated: false,
  },
  {
    id: 'demo_upi',
    label: 'UPI QR',
    description: 'No UPI app, PIN, or bank account is used.',
    simulated: true,
  },
  {
    id: 'demo_card',
    label: 'Credit/Debit Card',
    description: 'Use only the documented test inputs; never enter real card details.',
    simulated: true,
  },
]
