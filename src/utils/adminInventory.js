export function searchInventoryProducts(products, query, limit = 8) {
  const terms = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return products.slice(0, limit)

  return products
    .filter((product) => {
      const searchable = [
        product.name,
        product.brand,
        product.id,
        product.category,
      ].map((value) => String(value ?? '').toLowerCase())
      return terms.every((term) => searchable.some((value) => value.includes(term)))
    })
    .slice(0, limit)
}

export function selectInventoryProduct(form, product) {
  return { ...form, product_id: product.id }
}
