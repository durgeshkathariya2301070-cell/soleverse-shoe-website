import { supabase } from '../lib/supabaseClient.js'
import { resolveAdminAccess } from '../utils/adminAccess.js'
import { resolveAdminRequest } from '../utils/adminDashboard.js'

const unavailable = 'Supabase is not configured.'

export async function verifyAdminAccess() {
  if (!supabase) {
    return { status: 'error', error: 'Supabase is not configured.' }
  }
  try {
    const { data, error } = await supabase.rpc('is_soleverse_admin')
    const status = resolveAdminAccess(data, error)
    if (status === 'error') {
      return { status, error: 'Could not verify administrator access. Check the Phase 7 migration and your connection.' }
    }
    return { status, error: '' }
  } catch {
    return { status: 'error', error: 'Could not verify administrator access. Check your connection and try again.' }
  }
}

async function run(request) {
  if (!supabase) return { data: null, error: unavailable }
  return resolveAdminRequest(request)
}

export const fetchAdminDashboard = () => run(supabase?.rpc('soleverse_admin_dashboard'))
export const fetchAdminOrders = () => run(supabase?.rpc('soleverse_admin_orders'))
export async function fetchAdminOrder(orderId) {
  if (!supabase) return { data: null, error: unavailable }
  try {
    const [orderResult, paymentMethodResult] = await Promise.all([
      supabase.rpc('soleverse_admin_order_detail', { p_order_id: orderId }),
      supabase.rpc('soleverse_admin_demo_payment_method', { p_order_id: orderId }),
    ])
    if (orderResult.error || paymentMethodResult.error) {
      return { data: null, error: 'Order details could not be loaded. Check the payment-method migration and your administrator access.' }
    }
    let demoReceipt = null
    if (paymentMethodResult.data) {
      const { data, error } = await supabase.rpc('soleverse_admin_demo_payment_receipt', { p_order_id: orderId })
      if (error && !['PGRST202', '42883', '42P01'].includes(error.code)) {
        return { data: null, error: 'The payment details could not be loaded. Apply the payment-session migration and verify administrator access.' }
      }
      if (!error) demoReceipt = data
    }
    return {
      data: {
        ...orderResult.data,
        demo_payment_method: paymentMethodResult.data,
        demo_transaction: demoReceipt,
      },
      error: null,
    }
  } catch {
    return { data: null, error: 'Order details could not be loaded. Check your connection and administrator access.' }
  }
}
export async function updateAdminOrderStatus(orderId, status) {
  if (!supabase) return { data: null, error: unavailable }
  try {
    const { data, error } = await supabase.rpc('soleverse_admin_update_order_status', {
      p_order_id: orderId,
      p_status: status,
    })
    if (!error) return { data, error: null }
    const message = String(error.message ?? '').toLowerCase()
    if (message.includes('invalid_order_status_transition')) {
      return { data: null, error: 'That status transition is not allowed. An Out for Delivery order can return to Shipped only after the customer reports that it was not received.' }
    }
    if (message.includes('invalid_order_status')) {
      return { data: null, error: 'An administrator cannot mark an order Delivered. The customer must confirm receipt.' }
    }
    if (message.includes('not_authorized')) {
      return { data: null, error: 'Only an authorized administrator can update order fulfilment.' }
    }
    return { data: null, error: 'The order status could not be updated. Check the delivery-confirmation migration, administrator access, and your connection.' }
  } catch {
    return { data: null, error: 'The order status request could not reach Supabase. Check your connection and try again.' }
  }
}

const adminUserErrorMessage = (error) => {
  const message = String(error?.message ?? '').toLowerCase()
  if (message.includes('not_authorized')) return 'Only a current administrator can manage administrator access.'
  if (message.includes('invalid_email_search')) return 'Enter at least 3 characters of the registered user’s email.'
  if (message.includes('target_user_not_found')) return 'No registered account exists for that user.'
  if (message.includes('cannot_revoke_own_admin_access')) return 'You cannot revoke your own administrator access.'
  if (message.includes('cannot_remove_last_admin')) return 'The last administrator cannot be removed.'
  if (message.includes('target_is_not_an_admin')) return 'That account is not currently an administrator.'
  return 'The administrator change could not be completed. Check your connection and administrator access.'
}

async function runAdminUserRequest(request) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  try {
    const { data, error } = await request
    return error
      ? { data: null, error: adminUserErrorMessage(error) }
      : { data, error: null }
  } catch {
    return { data: null, error: 'The administrator request could not reach Supabase. Check your connection and try again.' }
  }
}

export const fetchAdminUsers = () =>
  runAdminUserRequest(supabase?.rpc('soleverse_admin_list_users'))

export const searchAdminUsers = (email) =>
  runAdminUserRequest(supabase?.rpc('soleverse_admin_search_users', { p_email: email }))

export const grantAdminAccess = (userId) =>
  runAdminUserRequest(supabase?.rpc('soleverse_admin_grant_access', { p_user_id: userId }))

export const revokeAdminAccess = (userId) =>
  runAdminUserRequest(supabase?.rpc('soleverse_admin_revoke_access', { p_user_id: userId }))

export async function fetchAdminProducts() {
  if (!supabase) return { data: null, error: unavailable }
  const result = await run(supabase?.from('products')
    .select('*, product_variants(*), product_images(*)')
    .order('name'))
  return result.error
    ? { data: null, error: 'Products could not be loaded. Check administrator access and apply migrations through 20261026000200_product_image_gallery.sql.' }
    : result
}

export async function saveAdminProduct(product, isNew) {
  if (!supabase) return { data: null, error: unavailable }

  if (Array.isArray(product.images) && Array.isArray(product.variants)) {
    try {
      if (isNew) {
        const { data: existing, error: lookupError } = await supabase
          .from('products')
          .select('id')
          .eq('id', product.id)
          .maybeSingle()
        if (lookupError) {
          return { data: null, error: 'Could not check whether this Product ID is already in use. Check your administrator access and connection.' }
        }
        if (existing) return { data: null, error: 'That Product ID already exists. Choose a different ID; existing products are never overwritten.' }
      }

      const images = product.images.map((image, position) => ({
        image_url: image.url.trim(),
        alt_text: image.alt_text?.trim() ?? '',
        position,
      }))
      const variants = product.variants.map((variant) => ({
        color_id: variant.color_id.trim(),
        color_label: variant.color_label.trim(),
        color_hex: variant.color_hex,
        size: Number(variant.size),
        stock: Number(variant.stock),
      }))
      const { data, error } = await supabase.rpc('soleverse_admin_save_product', {
        p_product: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price_inr: product.price_inr,
          is_active: product.is_active,
          category: product.category,
          brand: product.brand || '',
          sport: product.sport || '',
          style: product.style || '',
          short_description: product.short_description,
          description: product.description,
          image_url: images[0]?.image_url ?? '',
        },
        p_is_new: isNew,
        p_images: images,
        p_variants: variants,
      })
      if (error) {
        if (error.code === '23505') {
          return {
            data: null,
            error: String(error.details ?? error.message ?? '').includes('slug')
              ? 'That URL slug is already in use. Choose a different slug.'
              : 'That Product ID or size/colour combination already exists. Review the form and try again.',
          }
        }
        if (error.code === '42501' || String(error.message ?? '').includes('not_authorized')) {
          return { data: null, error: 'Only a current administrator can save products.' }
        }
        if (String(error.message ?? '').includes('product_requires_variant')) {
          return { data: null, error: 'Add at least one valid size and colour variant before publishing this product.' }
        }
        return { data: null, error: 'The product, images, and variants could not be saved. Check the gallery migration, administrator access, and your connection.' }
      }
      return { data, error: null }
    } catch {
      return { data: null, error: 'The product could not be saved because Supabase could not be reached. Your form is still available to retry.' }
    }
  }

  return run(isNew
    ? supabase.from('products').insert({ id: product.id, ...product })
    : supabase.from('products').update({
      slug: product.slug,
      name: product.name,
      price_inr: product.price_inr,
      is_active: product.is_active,
      category: product.category,
      brand: product.brand || null,
      sport: product.sport || null,
      style: product.style || null,
      short_description: product.short_description,
      description: product.description,
      image_url: product.image_url,
    }).eq('id', product.id))
}

export async function uploadAdminProductImage(productId, file) {
  if (!supabase) return { data: null, error: unavailable }
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const extension = extensions[file.type]
  if (!extension) {
    return { data: null, error: 'Choose a JPEG, PNG, WebP, or GIF image.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { data: null, error: 'Each image must be 10 MB or smaller.' }
  }

  try {
    const path = `${productId}/${crypto.randomUUID()}.${extension}`
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error) {
      if (error.code === '42501') {
        return { data: null, error: 'Supabase denied the image upload. Confirm admin access and apply the product gallery Storage migration.' }
      }
      return { data: null, error: 'The image upload failed. Check Storage setup and try again.' }
    }
    const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(data.path)
    return { data: { url: publicUrl.publicUrl }, error: null }
  } catch {
    return { data: null, error: 'The image upload could not reach Supabase. Your product form values are still available.' }
  }
}

export async function fetchAdminInventory() {
  if (!supabase) return { data: null, error: unavailable }
  try {
    const [productsResult, variantsResult] = await Promise.all([
      supabase.from('products')
        .select('id, name, is_active, category, brand, image_url, product_images(image_url, position)')
        .order('name')
        .order('position', { foreignTable: 'product_images', ascending: true })
        .limit(1, { foreignTable: 'product_images' }),
      supabase.from('product_variants')
        .select('product_id, color_id, color_label, color_hex, size, stock')
        .order('product_id')
        .order('color_id')
        .order('size'),
    ])
    if (productsResult.error || variantsResult.error) {
      return { data: null, error: 'Inventory could not be loaded. Check the Phase 7 migration and your administrator access.' }
    }
    const products = (productsResult.data ?? []).map((product) => ({
      ...product,
      image_url: [...(product.product_images ?? [])]
        .sort((a, b) => a.position - b.position)[0]?.image_url || product.image_url || '',
    }))
    return { data: { products, variants: variantsResult.data }, error: null }
  } catch {
    return { data: null, error: 'Inventory could not be loaded. Check your connection and administrator access.' }
  }
}

export async function saveAdminVariant(variant, isNew) {
  if (!supabase) return { data: null, error: unavailable }
  return run(isNew
    ? supabase.from('product_variants').insert(variant)
    : supabase.from('product_variants')
      .update({ stock: variant.stock, color_label: variant.color_label, color_hex: variant.color_hex })
      .eq('product_id', variant.product_id)
      .eq('color_id', variant.color_id)
      .eq('size', variant.size))
}
