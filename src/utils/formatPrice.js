// Formats a number as Indian rupees, e.g. 4999 -> "₹4,999".
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatPrice(amount) {
  return rupeeFormatter.format(amount)
}
