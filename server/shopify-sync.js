import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodeCron from 'node-cron';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Shopify configuration
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL; // e.g., 'your-store.myshopify.com'
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

// Fallback API versions to try if the primary one fails (most recent first)
const FALLBACK_API_VERSIONS = ['2024-10', '2024-07', '2024-04', '2024-01', '2023-10', '2023-07'];

if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Missing Shopify environment variables');
  console.error('Please add SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN to your .env file');
  process.exit(1);
}

// Payment method normalization (enhanced to handle gift cards and partial payments)
const normalizePayment = (paymentGateway, financialStatus, transactions = []) => {
  const gateway = (paymentGateway || '').toLowerCase();
  const status = (financialStatus || '').toLowerCase();

  // Check for gift card payments in transactions
  const giftCardTransactions = transactions.filter(t => 
    t.gateway && t.gateway.toLowerCase().includes('gift') ||
    t.kind === 'gift_card' ||
    (t.payment_details && t.payment_details.credit_card_company === 'gift_card')
  );

  // Check for partial payments
  const isPartiallyPaid = status.includes('partially') || status === 'partially_paid';
  
  // Collect all payment methods used
  const paymentMethods = [];
  if (giftCardTransactions.length > 0) {
    paymentMethods.push('gift_card');
  }
  
  // Check for ValU (separate from Paymob)
  if (gateway.includes('valu')) {
    if (!paymentMethods.includes('valu')) paymentMethods.push('valu');
  }
  
  // All card and online payment methods should be normalized to 'paymob'
  // This includes: paymob, card, visa, mastercard, credit, debit, sohoola, sympl, tru, stripe, paypal, etc.
  const isOnlinePayment = 
    gateway.includes('paymob') || 
    gateway.includes('pay mob') ||
    gateway.includes('card') ||
    gateway.includes('visa') ||
    gateway.includes('mastercard') ||
    gateway.includes('master card') ||
    gateway.includes('credit') ||
    gateway.includes('debit') ||
    gateway.includes('sohoola') ||
    gateway.includes('sympl') ||
    gateway.includes('tru') ||
    gateway.includes('stripe') ||
    gateway.includes('paypal') ||
    gateway.includes('square') ||
    gateway.includes('razorpay') ||
    gateway.includes('fawry') ||
    gateway.includes('instapay') ||
    gateway.includes('vodafone cash') ||
    gateway.includes('vodafonecash') ||
    gateway.includes('orange cash') ||
    gateway.includes('orangecash') ||
    gateway.includes('we pay') ||
    gateway.includes('wepay');
  
  if (isOnlinePayment) {
    if (!paymentMethods.includes('paymob')) paymentMethods.push('paymob');
  }

  // Determine payment status
  // Paymob, Valu, and all online payment methods are always paid, regardless of financial_status
  let paymentStatus = 'cod';
  if (gateway.includes('valu')) {
    paymentStatus = 'paid';
  } else if (isOnlinePayment) {
    paymentStatus = 'paid';
  } else if (status.includes('paid') && !isPartiallyPaid) {
    paymentStatus = 'paid';
  } else if (isPartiallyPaid) {
    paymentStatus = 'partially_paid';
  } else if (status.includes('pending') || status.includes('authorized')) {
    paymentStatus = 'pending';
  }

  // Determine primary payment method
  let primaryMethod = 'cash';
  if (paymentMethods.length > 0) {
    primaryMethod = paymentMethods[0];
  } else if (status.includes('paid') && !isPartiallyPaid) {
    primaryMethod = 'paid';
  }

  return { 
    method: primaryMethod, 
    status: paymentStatus,
    paymentMethods: paymentMethods, // Array of all payment methods used
    hasGiftCard: giftCardTransactions.length > 0,
    isPartiallyPaid: isPartiallyPaid
  };
};

// Fetch a single page of orders from Shopify with automatic API version fallback
async function fetchShopifyOrdersPage(limit = 250, sinceId = null, apiVersion = null, updatedAtMin = null) {
  // Ensure store URL doesn't have https:// or trailing slashes
  let storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Use provided API version or try primary first, then fallbacks
  const versionsToTry = apiVersion 
    ? [apiVersion]
    : [SHOPIFY_API_VERSION, ...FALLBACK_API_VERSIONS.filter(v => v !== SHOPIFY_API_VERSION)];
  
  for (const version of versionsToTry) {
    try {
      // Request complete order data including line items, customer, addresses, etc.
      // We explicitly include current_* fields to handle edited orders correctly
      let url = `https://${storeUrl}/admin/api/${version}/orders.json?limit=${limit}&status=any&fields=id,order_number,name,email,created_at,updated_at,cancelled_at,closed_at,cancel_reason,financial_status,fulfillment_status,gateway,payment_gateway_names,total_price,subtotal_price,total_tax,total_discounts,total_shipping_price_set,currency,tags,note,customer_note,line_items,shipping_address,billing_address,customer,fulfillments,shipping_lines,refunds,total_outstanding,current_total_price,current_subtotal_price,current_total_tax,current_total_discounts,current_total_duties,payment_transactions`;
      
      if (sinceId) {
        url += `&since_id=${sinceId}`;
      }
      
      if (updatedAtMin) {
        url += `&updated_at_min=${updatedAtMin}`;
      }

      console.log(`🔍 Fetching orders page (API ${version}): ${url.replace(SHOPIFY_ACCESS_TOKEN, '***')}`);

      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        const linkHeader = response.headers.get('link');
        
        return {
          orders,
          linkHeader,
          apiVersion: version,
        };
      }

      // If 404, try next API version
      if (response.status === 404) {
        const errorText = await response.text().catch(() => 'No error details');
        console.log(`⚠️ API version ${version} returned 404, trying next version...`);
        continue; // Try next version
      }

      // For other errors (401, 403, etc.), throw immediately
      const errorText = await response.text().catch(() => 'No error details');
      console.error(`❌ API Response: ${response.status} ${response.statusText}`);
      console.error(`❌ Error details: ${errorText}`);
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}. ${errorText}`);

    } catch (error) {
      // If it's a network error or non-404 HTTP error, throw it
      if (!error.message.includes('404')) {
        console.error(`❌ Error with API version ${version}:`, error.message);
        throw error;
      }
      // If 404, continue to next version
      continue;
    }
  }

  // If all versions failed with 404
  throw new Error(`All API versions failed with 404. Please verify your store URL: ${storeUrl}`);
}

// Fetch orders from Shopify using pagination
async function fetchAllShopifyOrders(updatedAtMin = null) {
  console.log(`📦 Starting to fetch orders from Shopify${updatedAtMin ? ` (updated since ${updatedAtMin})` : ' (ALL orders)'}...`);
  
  let allOrders = [];
  let sinceId = null;
  let apiVersion = null;
  let pageCount = 0;
  const maxPages = 10000; // Safety limit
  
  while (pageCount < maxPages) {
    pageCount++;
    console.log(`📄 Fetching page ${pageCount}${sinceId ? ` (since_id: ${sinceId})` : ' (first page)'}...`);
    
    try {
      const result = await fetchShopifyOrdersPage(250, sinceId, apiVersion, updatedAtMin);
      const orders = result.orders;
      apiVersion = result.apiVersion; // Remember working API version
      
      if (orders.length === 0) {
        console.log(`✅ No more orders returned.`);
        break;
      }
      
      allOrders = allOrders.concat(orders);
      console.log(`✅ Page ${pageCount}: Fetched ${orders.length} orders (Total so far: ${allOrders.length})`);
      
      // Get the last order's ID to use as since_id for next page
      const lastOrder = orders[orders.length - 1];
      sinceId = lastOrder.id;
      
      // If we got fewer orders than the limit, we've reached the end
      if (orders.length < 250) {
        console.log(`✅ Reached end of orders list.`);
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error fetching page ${pageCount}:`, error.message);
      if (allOrders.length === 0) throw error;
      break;
    }
  }
  
  console.log(`✅ Finished fetching: ${allOrders.length} total orders.`);
  return allOrders;
}

// Fetch product images from Shopify Products API
async function fetchProductImages(productIds, variantIds) {
  const imageMap = {};
  const storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Get unique product IDs
  const uniqueProductIds = [...new Set(productIds.filter(id => id))];
  
  console.log(`📸 fetchProductImages called with ${uniqueProductIds.length} unique product IDs`);
  
  if (uniqueProductIds.length === 0) {
    console.warn('⚠️ No product IDs provided to fetchProductImages');
    return imageMap;
  }

  // Try multiple API versions
  const versionsToTry = [SHOPIFY_API_VERSION, ...FALLBACK_API_VERSIONS.filter(v => v !== SHOPIFY_API_VERSION)];
  
  let success = false;
  
  for (const apiVersion of versionsToTry) {
    try {
      // Fetch products in batches (Shopify API LIMIT: max 50 products per request when using ?ids=)
      // Even though docs say 250, the ?ids= parameter is limited to 50
      const batchSize = 50;
      const totalBatches = Math.ceil(uniqueProductIds.length / batchSize);
      
      for (let i = 0; i < uniqueProductIds.length; i += batchSize) {
        const batch = uniqueProductIds.slice(i, i + batchSize);
        const idsParam = batch.join(',');
        
        const url = `https://${storeUrl}/admin/api/${apiVersion}/products.json?ids=${idsParam}`;
        
        console.log(`📸 Fetching products batch ${Math.floor(i / batchSize) + 1}/${totalBatches}: ${batch.length} products (API ${apiVersion})`);
        
        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          console.log(`📸 API Response OK. Products received: ${data.products ? data.products.length : 0} (requested ${batch.length})`);
          
          // Check which products were NOT returned
          const returnedProductIds = new Set((data.products || []).map(p => p.id));
          const missingFromResponse = batch.filter(id => !returnedProductIds.has(Number(id)));
          if (missingFromResponse.length > 0) {
            console.warn(`⚠️ ${missingFromResponse.length} products not returned by API. Sample missing: ${missingFromResponse.slice(0, 5).join(', ')}`);
            console.warn(`⚠️ These products may not exist in Shopify or may have been deleted.`);
          }
          
          if (data.products && data.products.length > 0) {
            console.log(`📸 Processing ${data.products.length} products for images`);
            
            data.products.forEach(product => {
              // Get first product image - try all images if first doesn't work
              let productImageUrl = null;
              
              console.log(`📸 Product ${product.id} (${product.title}): ${product.images ? product.images.length : 0} images`);
              
              if (product.images && product.images.length > 0) {
                // Try to find the best image (prefer non-placeholder)
                for (const img of product.images) {
                  const imgUrl = typeof img === 'string' 
                    ? img 
                    : (img.src || img.url);
                  
                  if (imgUrl && !imgUrl.includes('placeholder') && !imgUrl.includes('no-image')) {
                    productImageUrl = imgUrl;
                    break;
                  }
                }
                
                // If no good image found, use first one anyway
                if (!productImageUrl && product.images[0]) {
                  const firstImg = product.images[0];
                  productImageUrl = typeof firstImg === 'string' 
                    ? firstImg 
                    : (firstImg.src || firstImg.url || firstImg);
                }
              }
              
              if (productImageUrl) {
                // Store as BOTH number and string keys for compatibility
                const productIdNum = Number(product.id);
                const productIdStr = String(product.id);
                
                imageMap[productIdNum] = productImageUrl;
                imageMap[productIdStr] = productImageUrl;
                
                console.log(`✅ Mapped product ${product.id} (num: ${productIdNum}, str: "${productIdStr}") to image: ${productImageUrl.substring(0, 80)}...`);
                
                // Also map to variant_ids if variants exist
                if (product.variants && product.variants.length > 0) {
                  product.variants.forEach(variant => {
                    if (variant.id) {
                      // Try variant image first, then product image
                      let variantImageUrl = productImageUrl; // Default to product image
                      
                      if (variant.image_id) {
                        const variantImage = product.images.find(img => {
                          const imgId = typeof img === 'object' ? img.id : null;
                          return imgId === variant.image_id;
                        });
                        
                        if (variantImage) {
                          variantImageUrl = typeof variantImage === 'string' 
                            ? variantImage 
                            : (variantImage.src || variantImage.url || variantImage);
                        }
                      }
                      
                      // Store as BOTH number and string keys
                      const variantIdNum = Number(variant.id);
                      const variantIdStr = String(variant.id);
                      
                      imageMap[variantIdNum] = variantImageUrl;
                      imageMap[variantIdStr] = variantImageUrl;
                      
                      console.log(`✅ Mapped variant ${variant.id} (num: ${variantIdNum}, str: "${variantIdStr}") to image: ${variantImageUrl.substring(0, 80)}...`);
                    }
                  });
                }
              } else {
                console.warn(`⚠️ No image found for product ${product.id} (${product.title || 'unknown'})`);
              }
            });
            
            success = true;
          } else {
            console.warn(`⚠️ No products returned in response`);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ API Response Error ${response.status}: ${response.statusText}`);
          console.error(`❌ Error details: ${errorText.substring(0, 200)}`);
          
          if (response.status === 404) {
            // Try next API version
            continue;
          } else if (response.status === 401) {
            console.error(`❌ Authentication failed. Check SHOPIFY_ACCESS_TOKEN`);
            break; // Don't try other versions if auth fails
          }
        }
      }
      
      // If we got here and succeeded, break out of version loop
      if (success) {
        break;
      }
    } catch (error) {
      console.error(`❌ Error fetching product images with API version ${apiVersion}:`, error.message);
      console.error(error.stack);
      continue;
    }
  }
  
  console.log(`📸 fetchProductImages returning ${Object.keys(imageMap).length} image mappings`);
  console.log(`📸 Sample keys: ${Object.keys(imageMap).slice(0, 5).join(', ')}`);
  
  // If we have missing products, try fetching them individually (in case batch failed)
  const missingProductIds = uniqueProductIds.filter(id => {
    const idNum = Number(id);
    const idStr = String(id);
    return !imageMap[idNum] && !imageMap[idStr] && !imageMap[id];
  });
  
  if (missingProductIds.length > 0) {
    // Fetch missing products individually (limit to 200 to avoid too many API calls)
    const maxIndividualFetches = 200;
    const productsToFetch = missingProductIds.slice(0, maxIndividualFetches);
    
    console.log(`📸 Attempting to fetch ${productsToFetch.length} missing products individually (out of ${missingProductIds.length} missing)...`);
    
    // Process in smaller batches to avoid overwhelming the API
    const individualBatchSize = 10;
    for (let i = 0; i < productsToFetch.length; i += individualBatchSize) {
      const batch = productsToFetch.slice(i, i + individualBatchSize);
      
      // Fetch batch in parallel (with small delay between batches)
      await Promise.all(batch.map(async (productId) => {
        try {
          const url = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`;
          const response = await fetch(url, {
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const product = data.product;
            
            if (product && product.images && product.images.length > 0) {
              const imgUrl = typeof product.images[0] === 'string' 
                ? product.images[0] 
                : (product.images[0].src || product.images[0].url);
              
              if (imgUrl) {
                const idNum = Number(productId);
                const idStr = String(productId);
                imageMap[idNum] = imgUrl;
                imageMap[idStr] = imgUrl;
                
                // Also map variants
                if (product.variants) {
                  product.variants.forEach(variant => {
                    if (variant.id) {
                      const variantIdNum = Number(variant.id);
                      const variantIdStr = String(variant.id);
                      imageMap[variantIdNum] = imgUrl;
                      imageMap[variantIdStr] = imgUrl;
                    }
                  });
                }
                
                console.log(`✅ Fetched missing product ${productId} individually: ${imgUrl.substring(0, 60)}...`);
              }
            }
          }
        } catch (error) {
          // Silently continue - product might not exist
        }
      }));
      
      // Small delay between batches to avoid rate limiting
      if (i + individualBatchSize < productsToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`📸 After individual fetch: ${Object.keys(imageMap).length} total image mappings`);
  }
  
  return imageMap;
}

// Convert Shopify order to database format (COMPLETE DATA)
async function convertShopifyOrderToDB(shopifyOrder, imageMap = {}, existingOrder = null) {
  // Get payment transactions (for gift cards and partial payments)
  const transactions = shopifyOrder.payment_transactions || [];
  
  const paymentInfo = normalizePayment(
    shopifyOrder.gateway || shopifyOrder.payment_gateway_names?.[0],
    shopifyOrder.financial_status,
    transactions
  );

  // Get addresses
  const shippingAddress = shopifyOrder.shipping_address || {};
  const billingAddress = shopifyOrder.billing_address || {};
  const customer = shopifyOrder.customer || {};

  // Use provided image map (from batch fetch) or fetch individually if not provided
  let productImageMap = imageMap || {};
  
  // If no image map provided, fetch for this order only
  if (Object.keys(productImageMap).length === 0) {
    const productIds = [];
    const variantIds = [];
    (shopifyOrder.line_items || []).forEach(item => {
      if (item.product_id) productIds.push(item.product_id);
      if (item.variant_id) variantIds.push(item.variant_id);
    });

    if (productIds.length > 0) {
      try {
        console.log(`📸 Fetching images for order ${shopifyOrder.name || shopifyOrder.id}:`, {
          productIds: productIds.length,
          variantIds: variantIds.length
        });
        productImageMap = await fetchProductImages(productIds, variantIds);
        console.log(`📸 Fetched ${Object.keys(productImageMap).length} images`);
      } catch (error) {
        console.warn('⚠️ Error fetching product images:', error.message);
      }
    }
  }

  // Extract product images from line items and combine with fetched images
  const productImages = (shopifyOrder.line_items || []).map(item => {
    let imageUrl = null;
    
    // PRIORITY 1: Try to get image from line item data FIRST
    if (!imageUrl && item.image) {
      const img = item.image;
      if (typeof img === 'string' && img.trim() !== '' && img !== 'null') {
        imageUrl = img;
      } else if (typeof img === 'object' && img !== null) {
        imageUrl = img.src || img.url || img.original_src || null;
      }
    }
    
    // Check variant image
    if (!imageUrl && item.variant?.image) {
      const img = item.variant.image;
      if (typeof img === 'string' && img.trim() !== '' && img !== 'null') {
        imageUrl = img;
      } else if (typeof img === 'object' && img !== null) {
        imageUrl = img.src || img.url || img.original_src || null;
      }
    }
    
    // PRIORITY 2: Try fetched image map
    if (!imageUrl && item.variant_id != null) {
      imageUrl = productImageMap[Number(item.variant_id)] || productImageMap[String(item.variant_id)] || productImageMap[item.variant_id];
    }
    
    if (!imageUrl && item.product_id != null) {
      imageUrl = productImageMap[Number(item.product_id)] || productImageMap[String(item.product_id)] || productImageMap[item.product_id];
    }
    
    // Normalize URL
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      imageUrl = `https://cdn.shopify.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }
    
    return {
      product_id: item.product_id,
      variant_id: item.variant_id,
      image: imageUrl,
      title: item.title,
    };
  });

  // Collect ALL unique items from Shopify payload (active + refunded)
  const lineItemsMap = new Map();
  
  // 1. Add current active line items
  (shopifyOrder.line_items || []).forEach(item => {
    lineItemsMap.set(String(item.id), {
      ...item,
      is_removed: item.quantity === 0 || item.fulfillment_status === 'removed' || (item.properties && item.properties._is_removed)
    });
  });

  // 2. Add items from fulfillments (to catch items that might be missing from line_items)
  (shopifyOrder.fulfillments || []).forEach(fulfillment => {
    (fulfillment.line_items || []).forEach(li => {
      if (!lineItemsMap.has(String(li.id))) {
        lineItemsMap.set(String(li.id), {
          ...li,
          fulfillment_status: fulfillment.status || li.fulfillment_status,
          is_removed: false // If it's in a fulfillment, it's not removed
        });
      }
    });
  });

  // 3. Add items from refunds (to catch removed items)
  (shopifyOrder.refunds || []).forEach(refund => {
    (refund.refund_line_items || []).forEach(rli => {
      const li = rli.line_item;
      if (li && !lineItemsMap.has(String(li.id))) {
        lineItemsMap.set(String(li.id), {
          ...li,
          quantity: 0,
          is_removed: true,
          fulfillment_status: 'removed',
          properties: { ...(li.properties || {}), _is_removed: true }
        });
      } else if (li && lineItemsMap.has(String(li.id))) {
        // If it exists but is fully refunded, mark as removed
        const existing = lineItemsMap.get(String(li.id));
        if (rli.quantity >= existing.quantity) {
          existing.is_removed = true;
          existing.fulfillment_status = 'removed';
        }
      }
    });
  });

  // 3. Merge with existing items in our DB to ensure nothing is lost
  if (existingOrder && existingOrder.line_items) {
    let existingItems = [];
    try {
      existingItems = typeof existingOrder.line_items === 'string' 
        ? JSON.parse(existingOrder.line_items) 
        : existingOrder.line_items;
    } catch (e) {
      existingItems = [];
    }

    if (Array.isArray(existingItems)) {
      existingItems.forEach(oldItem => {
        const id = oldItem.id || oldItem.shopify_line_item_id;
        if (id && !lineItemsMap.has(String(id))) {
          lineItemsMap.set(String(id), {
            ...oldItem,
            quantity: 0,
            is_removed: true,
            fulfillment_status: 'removed',
            properties: { ...(oldItem.properties || {}), _is_removed: true }
          });
        }
      });
    }
  }

  const finalLineItems = Array.from(lineItemsMap.values());

  // LOG PRICES FOR DEBUGGING
  console.log(`💰 Order ${shopifyOrder.name} Price Sync:`, {
    total_price: shopifyOrder.total_price,
    current_total_price: shopifyOrder.current_total_price,
    total_outstanding: shopifyOrder.total_outstanding,
    subtotal_price: shopifyOrder.subtotal_price,
    current_subtotal_price: shopifyOrder.current_subtotal_price,
    total_discounts: shopifyOrder.total_discounts,
    current_total_discounts: shopifyOrder.current_total_discounts
  });

  // Prepare order data with ALL Shopify information
  return {
    // Basic order info
    order_id: shopifyOrder.name || shopifyOrder.order_number?.toString() || shopifyOrder.id?.toString(),
    shopify_order_id: shopifyOrder.id,
    shopify_order_number: shopifyOrder.order_number?.toString(),
    shopify_order_name: shopifyOrder.name,
    
    // Customer information (complete)
    customer_name: shippingAddress.name || billingAddress.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown',
    customer_email: customer.email || shopifyOrder.email || null,
    customer_id: customer.id || null,
    customer_phone: shippingAddress.phone || billingAddress.phone || customer.phone || 'N/A',
    mobile_number: shippingAddress.phone || billingAddress.phone || customer.phone || 'N/A',
    
    // Addresses (complete)
    address: shippingAddress.address1 || shippingAddress.address2 || billingAddress.address1 || 'N/A',
    billing_address: billingAddress,
    shipping_address: shippingAddress,
    billing_city: billingAddress.city || null,
    shipping_city: shippingAddress.city || null,
    billing_country: billingAddress.country || null,
    shipping_country: shippingAddress.country || null,
    billing_zip: billingAddress.zip || null,
    shipping_zip: shippingAddress.zip || null,
    
    // Financial information (complete)
    // CRITICAL: current_total_price is the one that reflects edits!
    total_order_fees: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0),
    subtotal_price: parseFloat(shopifyOrder.current_subtotal_price || shopifyOrder.subtotal_price || 0),
    total_tax: parseFloat(shopifyOrder.current_total_tax || shopifyOrder.total_tax || 0),
    total_discounts: parseFloat(shopifyOrder.current_total_discounts || shopifyOrder.total_discounts || 0),
    total_shipping_price: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || shopifyOrder.total_shipping_price_set?.amount || 0),
    currency: shopifyOrder.currency || 'EGP',
    balance: parseFloat(shopifyOrder.total_outstanding || 0),
    total_price: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0),
    total_paid: parseFloat(shopifyOrder.current_total_price || shopifyOrder.total_price || 0) - parseFloat(shopifyOrder.total_outstanding || 0),
    
    // Payment information
    payment_method: paymentInfo.method,
    payment_status: paymentInfo.status,
    financial_status: shopifyOrder.financial_status || paymentInfo.status,
    payment_gateway_names: shopifyOrder.payment_gateway_names || [],
    // Store payment transactions for gift cards and partial payments
    payment_transactions: transactions.length > 0 ? JSON.stringify(transactions) : null,
    
    // Shipping information
    shipping_method: shopifyOrder.shipping_lines?.[0]?.title || null,
    fulfillment_status: shopifyOrder.fulfillment_status || null,
    tracking_number: shopifyOrder.fulfillments?.[0]?.tracking_number || null,
    tracking_url: shopifyOrder.fulfillments?.[0]?.tracking_url || null,
    
    // Order items/products (stored as JSON)
    line_items: finalLineItems,
    product_images: productImages,
    
    // Order metadata
    // IMPORTANT: Handle empty strings - if tags is empty string, return empty array
    // Also filter out any empty strings that might result from splitting
    order_tags: shopifyOrder.tags && shopifyOrder.tags.trim() 
      ? shopifyOrder.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) 
      : [],
    order_note: shopifyOrder.note || null,
    customer_note: shopifyOrder.customer_note || null,
    notes: shopifyOrder.note || shopifyOrder.customer_note || '',
    
    // Status - check if order is canceled in Shopify
    status: shopifyOrder.cancelled_at ? 'canceled' : 'pending',
    
    // Archived - check if order is archived in Shopify
    archived: shopifyOrder.closed_at ? true : false,
    
    // Shopify timestamps
    shopify_created_at: shopifyOrder.created_at ? new Date(shopifyOrder.created_at).toISOString() : null,
    shopify_updated_at: shopifyOrder.updated_at ? new Date(shopifyOrder.updated_at).toISOString() : null,
    shopify_cancelled_at: shopifyOrder.cancelled_at ? new Date(shopifyOrder.cancelled_at).toISOString() : null,
    shopify_closed_at: shopifyOrder.closed_at ? new Date(shopifyOrder.closed_at).toISOString() : null,
    cancelled_reason: shopifyOrder.cancel_reason || null,
    cancel_reason: shopifyOrder.cancel_reason || null,
    archived_at: shopifyOrder.closed_at ? new Date(shopifyOrder.closed_at).toISOString() : null,
    
    // Raw Shopify data (for reference/debugging)
    shopify_raw_data: shopifyOrder,
    
    // Timestamps
    created_at: new Date(shopifyOrder.created_at).toISOString(),
    updated_at: new Date(shopifyOrder.updated_at || shopifyOrder.created_at).toISOString(),
  };
}

// Sync order items (products) to order_items table
async function syncOrderItems(orderId, lineItems, refunds = [], fulfillments = []) {
  if (!lineItems) return;

  // 1. Fetch current items in DB for this order
  const { data: existingItemsDB } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  const existingItemsMap = new Map();
  (existingItemsDB || []).forEach(item => {
    const key = item.shopify_line_item_id ? String(item.shopify_line_item_id) : `db-${item.id}`;
    existingItemsMap.set(key, item);
  });

  // 2. Collect ALL items from Shopify (active + refunded + fulfilled)
  const finalItemsMap = new Map();

  // Add currently active line items
  lineItems.forEach(item => {
    const isRemovedInShopify = item.quantity === 0 || item.fulfillment_status === 'removed';
    
    // Find fulfillment status for this specific line item
    let fulfillmentStatus = item.fulfillment_status;
    if (fulfillments && Array.isArray(fulfillments)) {
      fulfillments.forEach(f => {
        if (f.line_items && Array.isArray(f.line_items)) {
          const match = f.line_items.find(fli => String(fli.id) === String(item.id));
          if (match) {
            fulfillmentStatus = 'fulfilled'; // If it's in a fulfillment, mark as fulfilled
          }
        }
      });
    }

    finalItemsMap.set(String(item.id), {
      order_id: orderId,
      shopify_line_item_id: String(item.id),
      product_id: item.product_id,
      variant_id: item.variant_id,
      title: item.title || '',
      variant_title: item.variant_title || null,
      quantity: item.quantity || 0,
      price: parseFloat(item.price || 0),
      total_discount: parseFloat(item.total_discount || 0),
      sku: item.sku || null,
      vendor: item.vendor || null,
      product_type: item.product_type || null,
      requires_shipping: item.requires_shipping !== false,
      taxable: item.taxable !== false,
      fulfillment_status: fulfillmentStatus || (isRemovedInShopify ? 'removed' : null),
      image_url: item.image || item.variant?.image || null,
      image_alt: item.name || item.title || null,
      properties: item.properties || null,
      shopify_raw_data: { ...item, fulfillment_status: fulfillmentStatus },
      is_removed: isRemovedInShopify,
      updated_at: new Date().toISOString(),
    });
  });

  // Add items from fulfillments that might be missing from line_items
  if (fulfillments && Array.isArray(fulfillments)) {
    fulfillments.forEach(f => {
      (f.line_items || []).forEach(li => {
        if (!finalItemsMap.has(String(li.id))) {
          finalItemsMap.set(String(li.id), {
            order_id: orderId,
            shopify_line_item_id: String(li.id),
            product_id: li.product_id,
            variant_id: li.variant_id,
            title: li.title || '',
            variant_title: li.variant_title || null,
            quantity: li.quantity || 0,
            price: parseFloat(li.price || 0),
            total_discount: 0,
            sku: li.sku || null,
            vendor: li.vendor || null,
            fulfillment_status: 'fulfilled',
            is_removed: false,
            shopify_raw_data: { ...li, fulfillment_status: 'fulfilled' },
            updated_at: new Date().toISOString(),
          });
        }
      });
    });
  }

  // Add items from refunds
  (refunds || []).forEach(refund => {
    (refund.refund_line_items || []).forEach(rli => {
      const li = rli.line_item;
      if (li && !finalItemsMap.has(String(li.id))) {
        finalItemsMap.set(String(li.id), {
          order_id: orderId,
          shopify_line_item_id: String(li.id),
          product_id: li.product_id,
          variant_id: li.variant_id,
          title: li.title || '',
          variant_title: li.variant_title || null,
          quantity: 0,
          price: parseFloat(li.price || 0),
          total_discount: parseFloat(li.total_discount || 0),
          sku: li.sku || null,
          vendor: li.vendor || null,
          is_removed: true,
          fulfillment_status: 'removed',
          properties: { ...(li.properties || {}), _is_removed: true },
          shopify_raw_data: li,
          updated_at: new Date().toISOString(),
        });
      }
    });
  });

  // Merge with existing DB items to ensure history is kept
  // IMPORTANT: Preserve manually removed items (items that exist in Shopify but were manually marked as removed)
  existingItemsMap.forEach((dbItem, key) => {
    if (!finalItemsMap.has(key)) {
      // Item doesn't exist in Shopify anymore - mark as removed
      finalItemsMap.set(key, {
        ...dbItem,
        is_removed: true,
        quantity: 0,
        fulfillment_status: 'removed',
        properties: { ...(dbItem.properties || {}), _is_removed: true },
        updated_at: new Date().toISOString()
      });
    } else {
      // Item exists in Shopify - check if it was manually removed in DB
      const shopifyItem = finalItemsMap.get(key);
      const wasManuallyRemoved = dbItem.is_removed === true && 
                                  shopifyItem.quantity > 0 && 
                                  !shopifyItem.is_removed;
      
      if (wasManuallyRemoved) {
        // Preserve manual removal - item exists in Shopify but admin removed it
        console.log(`🔒 Preserving manually removed item: ${dbItem.title} (Shopify ID: ${key})`);
        finalItemsMap.set(key, {
          ...shopifyItem,
          is_removed: true,
          quantity: 0,
          fulfillment_status: 'removed',
          properties: { ...(shopifyItem.properties || {}), _is_removed: true },
          updated_at: new Date().toISOString()
        });
      }
    }
  });

  const allItems = Array.from(finalItemsMap.values());

  console.log(`🧹 Syncing ${allItems.length} total items for order ${orderId} (${allItems.filter(i => i.is_removed).length} marked as removed)`);

  // 6. Delete existing items for this order and insert everything fresh
  await supabase
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (allItems.length > 0) {
    const { error: insertError } = await supabase
      .from('order_items')
      .insert(allItems.map(i => {
        const { id, created_at, ...rest } = i;
        return rest;
      }));

    if (insertError) {
      console.error(`❌ Error inserting items for order ${orderId}:`, insertError);
    }
  }
}

// Sync orders from Shopify to database
async function syncShopifyOrders(updatedAtMin = null) {
  try {
    console.log(`🔄 Starting Shopify order sync${updatedAtMin ? ` (updated since ${updatedAtMin})` : ''}...`);
    
    // Fetch orders from Shopify (with pagination)
    const shopifyOrders = await fetchAllShopifyOrders(updatedAtMin);
    
    if (shopifyOrders.length === 0) {
      console.log('✅ No orders found in Shopify');
      return { success: true, imported: 0, updated: 0 };
    }

    console.log(`📦 Found ${shopifyOrders.length} total orders in Shopify (syncing all...)`);

    // Collect all product IDs and variant IDs from all orders for batch image fetching
    const allProductIds = [];
    const allVariantIds = [];
    shopifyOrders.forEach(order => {
      (order.line_items || []).forEach(item => {
        if (item.product_id) allProductIds.push(item.product_id);
        if (item.variant_id) allVariantIds.push(item.variant_id);
      });
    });

    // Get unique IDs
    const uniqueProductIds = [...new Set(allProductIds)];
    const uniqueVariantIds = [...new Set(allVariantIds)];
    
    console.log(`📸 Collected ${uniqueProductIds.length} unique product IDs and ${uniqueVariantIds.length} unique variant IDs from ${shopifyOrders.length} orders`);
    console.log(`📸 Sample product IDs: ${uniqueProductIds.slice(0, 10).join(', ')}`);

    // Fetch all product images in one batch
    let globalImageMap = {};
    if (uniqueProductIds.length > 0) {
      try {
        globalImageMap = await fetchProductImages(uniqueProductIds, uniqueVariantIds);
        console.log(`📸 Fetched images for ${Object.keys(globalImageMap).length} products/variants across all orders`);
        
        // Check which products are missing
        const missingProducts = uniqueProductIds.filter(id => 
          !globalImageMap[id] && !globalImageMap[String(id)] && !globalImageMap[Number(id)]
        );
        if (missingProducts.length > 0) {
          console.warn(`⚠️ ${missingProducts.length} products have no images in map. Sample missing IDs: ${missingProducts.slice(0, 10).join(', ')}`);
        }
      } catch (error) {
        console.warn('⚠️ Error fetching product images:', error.message);
      }
    }

    // Convert and prepare orders for database
    const ordersToInsert = [];
    let imported = 0;
    let updated = 0;
    const totalOrders = shopifyOrders.length;
    let processedCount = 0;

    console.log(`🔄 Processing ${totalOrders} orders...`);
    
    for (const shopifyOrder of shopifyOrders) {
      processedCount++;
      
      // Log progress every 50 orders
      if (processedCount % 50 === 0 || processedCount === totalOrders) {
        console.log(`📊 Progress: ${processedCount}/${totalOrders} orders processed (${Math.round(processedCount / totalOrders * 100)}%)`);
      }

      // 1. First, check if order already exists in our database
      // IMPORTANT: Only sync base orders (where base_order_id IS NULL) to avoid affecting date-suffixed assignment orders
      let existing = null;
      
      // Try to find by shopify_order_id (most reliable) - only base orders
      const { data: byShopifyId } = await supabase
        .from('orders')
        .select('id, shopify_order_id, order_id, status, payment_method, payment_status, financial_status, line_items, base_order_id')
        .eq('shopify_order_id', shopifyOrder.id)
        .is('base_order_id', null) // Only sync base orders
        .maybeSingle();
      
      existing = byShopifyId;
      
      // If not found, try by order name/id string - only base orders
      if (!existing && (shopifyOrder.name || shopifyOrder.order_number)) {
        const { data: byName } = await supabase
          .from('orders')
          .select('id, shopify_order_id, order_id, status, payment_method, payment_status, financial_status, line_items, base_order_id')
          .eq('order_id', shopifyOrder.name || shopifyOrder.order_number.toString())
          .is('base_order_id', null) // Only sync base orders
          .maybeSingle();
        existing = byName;
      }

      // 2. Now convert the Shopify data, passing the existing record to handle merged items correctly
      const dbOrder = await convertShopifyOrderToDB(shopifyOrder, globalImageMap, existing);
      
      if (existing) {
        // Update existing order with ALL data
        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            // Basic info
            order_id: dbOrder.order_id,
            shopify_order_id: dbOrder.shopify_order_id,
            shopify_order_number: dbOrder.shopify_order_number,
            shopify_order_name: dbOrder.shopify_order_name,
            
            // Customer
            customer_name: dbOrder.customer_name,
            customer_email: dbOrder.customer_email,
            customer_id: dbOrder.customer_id,
            customer_phone: dbOrder.customer_phone,
            mobile_number: dbOrder.mobile_number,
            
            // Addresses
            address: dbOrder.address,
            billing_address: dbOrder.billing_address,
            shipping_address: dbOrder.shipping_address,
            billing_city: dbOrder.billing_city,
            shipping_city: dbOrder.shipping_city,
            billing_country: dbOrder.billing_country,
            shipping_country: dbOrder.shipping_country,
            billing_zip: dbOrder.billing_zip,
            shipping_zip: dbOrder.shipping_zip,
            
            // Financial
            // IMPORTANT: Preserve manually edited total_order_fees if it differs from Shopify
            // This prevents overwriting admin edits (removed items, price changes)
            total_order_fees: (() => {
              const existingTotal = existing.total_order_fees || 0
              const shopifyTotal = dbOrder.total_order_fees || 0
              const lineItems = Array.isArray(dbOrder.line_items) ? dbOrder.line_items : []
              const hasRemovedItems = lineItems.some((i) => {
                const qtyZero = Number(i?.quantity) === 0
                const propRemoved = i?.properties?._is_removed === true || i?.properties?._is_removed === 'true'
                return i?.is_removed === true || qtyZero || propRemoved
              })

              // If Shopify cancelled the order, force Shopify total (usually 0)
              if (dbOrder.status === 'canceled' || dbOrder.shopify_cancelled_at) {
                return shopifyTotal
              }

              // If Shopify marks items as removed, trust Shopify totals (exclude removed items)
              if (hasRemovedItems) {
                return shopifyTotal
              }

              const difference = Math.abs(existingTotal - shopifyTotal)
              // If difference is significant (> 0.01), assume it was manually edited and preserve it
              if (difference > 0.01 && existingTotal > 0) {
                console.log(`🔒 Preserving manually edited total for order ${dbOrder.order_id}: ${existingTotal} (Shopify: ${shopifyTotal})`)
                return existingTotal
              }
              return dbOrder.total_order_fees
            })(),
            subtotal_price: dbOrder.subtotal_price,
            total_tax: dbOrder.total_tax,
            total_discounts: dbOrder.total_discounts,
            total_shipping_price: dbOrder.total_shipping_price,
            currency: dbOrder.currency,
            balance: dbOrder.balance,
            total_price: dbOrder.total_price,
            total_paid: dbOrder.total_paid,
            
            // Payment
            // CRITICAL: Protect ALL courier edits - never overwrite what courier has set
            // Check if order has courier edits (delivery_fee, partial_paid_amount, collected_by, etc.)
            payment_method: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (dbOrder.status === 'canceled') return dbOrder.payment_method
              if (hasCourierEdits && existing.payment_method) return existing.payment_method
              return (existing.status === 'pending' || !existing.status) ? dbOrder.payment_method : (existing.payment_method || dbOrder.payment_method)
            })(),
            payment_status: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (dbOrder.status === 'canceled') return (dbOrder.payment_status || 'cancelled')
              if (hasCourierEdits && existing.payment_status) return existing.payment_status
              return (existing.status === 'pending' || !existing.status) ? dbOrder.payment_status : (existing.payment_status || dbOrder.payment_status)
            })(),
            financial_status: (dbOrder.status === 'canceled')
              ? (dbOrder.financial_status || 'voided')
              : ((existing.status === 'pending' || !existing.status) ? dbOrder.financial_status : (existing.financial_status || dbOrder.financial_status)),
            // Preserve ALL courier-edited fields
            collected_by: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (hasCourierEdits && existing.collected_by) return existing.collected_by
              return (existing.collected_by || dbOrder.collected_by)
            })(),
            payment_sub_type: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (hasCourierEdits && existing.payment_sub_type) return existing.payment_sub_type
              return (existing.payment_sub_type || dbOrder.payment_sub_type)
            })(),
            delivery_fee: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (hasCourierEdits && existing.delivery_fee) return existing.delivery_fee
              return (existing.delivery_fee || dbOrder.delivery_fee)
            })(),
            partial_paid_amount: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (hasCourierEdits && existing.partial_paid_amount) return existing.partial_paid_amount
              return (existing.partial_paid_amount || dbOrder.partial_paid_amount)
            })(),
            internal_comment: (() => {
              const hasCourierEdits = existing.delivery_fee || 
                                     existing.partial_paid_amount || 
                                     existing.collected_by || 
                                     existing.payment_sub_type ||
                                     existing.internal_comment ||
                                     (existing.status && existing.status !== 'pending' && existing.status !== 'assigned')
              if (hasCourierEdits && existing.internal_comment) return existing.internal_comment
              return (existing.internal_comment || dbOrder.internal_comment)
            })(),
            payment_gateway_names: dbOrder.payment_gateway_names,
            
            // Shipping
            shipping_method: dbOrder.shipping_method,
            fulfillment_status: dbOrder.fulfillment_status,
            tracking_number: dbOrder.tracking_number,
            tracking_url: dbOrder.tracking_url,
            
            // Products
            line_items: dbOrder.line_items,
            product_images: dbOrder.product_images,
            
            // Metadata
            order_tags: dbOrder.order_tags,
            order_note: dbOrder.order_note,
            customer_note: dbOrder.customer_note,
            notes: dbOrder.notes,
            
            // Status - ALWAYS respect Shopify cancellation, but protect other courier-edited statuses
            // IMPORTANT: Preserve all processed statuses - never reset delivered/partial/etc. to pending
            // BUT: Cancellation is a Shopify action that should always be respected
            status: (() => {
              // ALWAYS respect Shopify cancellation - it's a Shopify action, not a courier action
              // Check for both cancelled_at and financial_status voided (Shopify can void orders without cancelled_at)
              const isCanceled = dbOrder.shopify_cancelled_at || 
                                dbOrder.status === 'canceled' ||
                                (dbOrder.financial_status && dbOrder.financial_status.toLowerCase() === 'voided')
              if (isCanceled) {
                return 'canceled'
              }
              // Protect courier-processed statuses from being reset to pending
              const processedStatuses = ['delivered', 'partial', 'return', 'hand_to_hand', 'receiving_part', 'assigned']
              const isExistingProcessed = existing.status && processedStatuses.includes(existing.status)
              if (isExistingProcessed) return existing.status
              // If not processed and not canceled, preserve existing status if it's not pending/assigned
              if (existing.status && existing.status !== 'pending' && existing.status !== 'assigned') {
                return existing.status
              }
              return (existing.status === 'pending' || !existing.status ? 'pending' : existing.status)
            })(),
            
            // Archived - update if order is archived in Shopify
            archived: dbOrder.archived, // This will be true if order is closed/fulfilled in Shopify
            archived_at: dbOrder.archived_at, // Set if order is closed in Shopify
            
            // Shopify timestamps
            shopify_created_at: dbOrder.shopify_created_at,
            shopify_updated_at: dbOrder.shopify_updated_at,
            shopify_cancelled_at: dbOrder.shopify_cancelled_at,
            shopify_closed_at: dbOrder.shopify_closed_at, // For archived orders
            cancelled_reason: dbOrder.cancelled_reason,
            cancel_reason: dbOrder.cancel_reason,
            
            // Raw data
            shopify_raw_data: dbOrder.shopify_raw_data,
            
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && updatedOrder) {
          updated++;
          // Sync order items including refunds and fulfillments to track removed items and item status
          await syncOrderItems(updatedOrder.id, shopifyOrder.line_items, shopifyOrder.refunds, shopifyOrder.fulfillments);
        } else {
          console.error(`❌ Error updating order ${dbOrder.order_id}:`, error);
        }
      } else {
        // Insert new order
        ordersToInsert.push(dbOrder);
      }
    }

    // Bulk insert new orders
    if (ordersToInsert.length > 0) {
      const { data: insertedOrders, error } = await supabase
        .from('orders')
        .insert(ordersToInsert)
        .select();

      if (error) {
        console.error('❌ Error inserting orders:', error);
        throw error;
      }

      imported = insertedOrders.length;
      
      // Sync order items for each new order
      for (let i = 0; i < insertedOrders.length; i++) {
        const insertedOrder = insertedOrders[i];
        const originalShopifyOrder = shopifyOrders.find(
          so => (so.id === insertedOrder.shopify_order_id) || 
                 (so.name === insertedOrder.order_id) ||
                 (so.order_number?.toString() === insertedOrder.shopify_order_number)
        );
        
        if (originalShopifyOrder && originalShopifyOrder.line_items) {
          await syncOrderItems(insertedOrder.id, originalShopifyOrder.line_items, originalShopifyOrder.refunds, originalShopifyOrder.fulfillments);
        }
      }
    }

    const skipped = totalOrders - imported - updated;
    console.log(`\n✅ ========================================`);
    console.log(`✅ SYNC COMPLETE SUMMARY`);
    console.log(`✅ ========================================`);
    console.log(`✅ Total orders fetched from Shopify: ${totalOrders}`);
    console.log(`✅ New orders imported: ${imported}`);
    console.log(`✅ Existing orders updated: ${updated}`);
    if (skipped > 0) {
      console.log(`⚠️  Orders skipped (duplicates/errors): ${skipped}`);
    }
    console.log(`✅ ========================================\n`);
    
    return { 
      success: true, 
      imported, 
      updated, 
      skipped,
      total: totalOrders,
      fetched: shopifyOrders.length 
    };
  } catch (error) {
    console.error('❌ Error syncing Shopify orders:', error);
    return { success: false, error: error.message };
  }
}

// Test endpoint to verify Shopify connection with multiple API versions
app.get('/api/shopify/test', async (req, res) => {
  const storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const versionsToTry = [SHOPIFY_API_VERSION, ...FALLBACK_API_VERSIONS.filter(v => v !== SHOPIFY_API_VERSION)];
  const results = [];

  for (const apiVersion of versionsToTry) {
    try {
      const testUrl = `https://${storeUrl}/admin/api/${apiVersion}/shop.json`;
      
      console.log(`🔍 Testing API version ${apiVersion}: ${testUrl.replace(SHOPIFY_ACCESS_TOKEN, '***')}`);
      
      const response = await fetch(testUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          message: `Shopify connection successful with API version ${apiVersion}!`,
          shop: data.shop,
          workingApiVersion: apiVersion,
          storeUrl: storeUrl,
          allVersionsTested: versionsToTry,
        });
      }

      const errorText = await response.text().catch(() => 'No error details');
      results.push({
        version: apiVersion,
        status: response.status,
        error: errorText,
      });

    } catch (error) {
      results.push({
        version: apiVersion,
        status: 'error',
        error: error.message,
      });
    }
  }

  // If all versions failed, return diagnostic info
  res.status(404).json({
    success: false,
    error: 'All API versions failed. Please verify your store URL and access token.',
    storeUrl: storeUrl,
    accessTokenPrefix: SHOPIFY_ACCESS_TOKEN.substring(0, 10) + '...',
    testedVersions: results,
    suggestions: [
      '1. Verify the store URL in Shopify Admin → Settings → General',
      '2. Check that your access token is correct (starts with shpat_)',
      '3. Ensure the app has read_orders and read_customers permissions',
      '4. Try the test endpoint: http://localhost:3002/api/shopify/find-store',
    ],
  });
});

// Manual sync endpoint for a single order
app.post('/api/shopify/sync-order/:shopifyId', async (req, res) => {
  const { shopifyId } = req.params;
  console.log(`\n🔄 Manual sync requested for Shopify order ID: ${shopifyId}`);
  
  try {
    const storeUrl = SHOPIFY_STORE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${storeUrl}/admin/api/${SHOPIFY_API_VERSION}/orders/${shopifyId}.json`;
    
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        success: false, 
        error: `Shopify API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    const shopifyOrder = data.order;

    if (!shopifyOrder) {
      return res.status(404).json({ success: false, error: 'Order not found in Shopify' });
    }

    // Find existing order in DB
    const { data: existing } = await supabase
      .from('orders')
      .select('id, status, payment_method, payment_status, financial_status, total_order_fees, line_items')
      .eq('shopify_order_id', shopifyId)
      .maybeSingle();

    // Convert to DB format - use empty object for imageMap as it will fetch individually if needed
    const dbOrder = await convertShopifyOrderToDB(shopifyOrder, {}, existing);

    let updatedOrder;
    if (existing) {
      // Update existing
      const { data: result, error } = await supabase
        .from('orders')
        .update({
          ...dbOrder,
          // Protect status and payment info if already handled, 
          // BUT ALWAYS update the total if it changed in Shopify
          status: dbOrder.status === 'canceled' 
            ? 'canceled' 
            : (existing.status === 'pending' || !existing.status ? 'pending' : existing.status),
          payment_method: (existing.status === 'pending' || !existing.status) ? dbOrder.payment_method : existing.payment_method,
          payment_status: (existing.status === 'pending' || !existing.status) ? dbOrder.payment_status : existing.payment_status,
          // IMPORTANT: Preserve manually edited total_order_fees if it differs from Shopify
          total_order_fees: (() => {
            const existingTotal = existing.total_order_fees || 0
            const shopifyTotal = dbOrder.total_order_fees || 0
            const lineItems = Array.isArray(dbOrder.line_items) ? dbOrder.line_items : []
            const hasRemovedItems = lineItems.some((i) => {
              const qtyZero = Number(i?.quantity) === 0
              const propRemoved = i?.properties?._is_removed === true || i?.properties?._is_removed === 'true'
              return i?.is_removed === true || qtyZero || propRemoved
            })

            // If Shopify marks items as removed, trust Shopify totals (exclude removed items)
            if (hasRemovedItems) {
              return shopifyTotal
            }

            const difference = Math.abs(existingTotal - shopifyTotal)
            // If difference is significant (> 0.01), assume it was manually edited and preserve it
            if (difference > 0.01 && existingTotal > 0) {
              console.log(`🔒 Preserving manually edited total for order ${dbOrder.order_id}: ${existingTotal} (Shopify: ${shopifyTotal})`)
              return existingTotal
            }
            return dbOrder.total_order_fees
          })(),
          // IMPORTANT: Always update order_tags from Shopify to reflect tag changes (additions/removals)
          // This ensures tags deleted in Shopify are removed from the system
          order_tags: dbOrder.order_tags,
          order_note: dbOrder.order_note,
          customer_note: dbOrder.customer_note,
          notes: dbOrder.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Log tag update for debugging
      const existingTags = existing.order_tags || [];
      const newTags = dbOrder.order_tags || [];
      if (JSON.stringify(existingTags) !== JSON.stringify(newTags)) {
        console.log(`🏷️  Tags updated for order ${dbOrder.order_id}: ${JSON.stringify(existingTags)} → ${JSON.stringify(newTags)}`);
      }
      
      updatedOrder = result;
    } else {
      // Insert new
      const { data: result, error } = await supabase
        .from('orders')
        .insert([dbOrder])
        .select()
        .single();
        
      if (error) throw error;
      updatedOrder = result;
    }

    // Sync items including fulfillments
    await syncOrderItems(updatedOrder.id, shopifyOrder.line_items, shopifyOrder.refunds, shopifyOrder.fulfillments);

    console.log(`✅ Manual sync successful for order ${dbOrder.order_id}`);
    res.json({ 
      success: true, 
      message: `Order ${dbOrder.order_id} synced successfully`,
      order: updatedOrder 
    });

  } catch (error) {
    console.error('❌ Error in manual sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Diagnostic endpoint to help find the correct store URL
app.get('/api/shopify/find-store', async (req, res) => {
  const possibleStoreNames = [
    'beauty-bareg',
    'beautybareg',
    'beauty-bar',
    'beautybar',
  ];

  const results = [];

  for (const storeName of possibleStoreNames) {
    const testUrl = `https://${storeName}.myshopify.com/admin/api/2024-10/shop.json`;
    
    try {
      const response = await fetch(testUrl, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({
          success: true,
          message: `Found working store URL!`,
          correctStoreUrl: `${storeName}.myshopify.com`,
          shop: data.shop,
          updateEnv: `SHOPIFY_STORE_URL=${storeName}.myshopify.com`,
        });
      }

      results.push({
        storeName: `${storeName}.myshopify.com`,
        status: response.status,
      });

    } catch (error) {
      results.push({
        storeName: `${storeName}.myshopify.com`,
        status: 'error',
        error: error.message,
      });
    }
  }

  res.json({
    success: false,
    message: 'Could not find store URL automatically',
    tested: results,
    instructions: [
      '1. Go to Shopify Admin',
      '2. Check Settings → General → Store details',
      '3. Look for "Store address" or check the URL in your browser',
      '4. Update SHOPIFY_STORE_URL in .env file with the correct store name',
    ],
  });
});

// API endpoint to manually trigger sync
app.get('/api/shopify/sync', async (req, res) => {
  try {
    const result = await syncShopifyOrders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to re-sync images for orders with missing images
app.get('/api/shopify/resync-images', async (req, res) => {
  try {
    console.log('🖼️ Starting image re-sync for orders with missing images...');
    
    // Get all Shopify orders from database
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_id, shopify_order_id, product_images, line_items, shopify_raw_data')
      .not('shopify_order_id', 'is', null)
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`📦 Found ${orders?.length || 0} Shopify orders to check`);
    
    // Find orders with missing images
    const ordersWithMissingImages = (orders || []).filter(order => {
      try {
        const productImages = typeof order.product_images === 'string' 
          ? JSON.parse(order.product_images) 
          : order.product_images;
        
        if (!productImages || !Array.isArray(productImages)) return true;
        
        // Check if any item has no image
        return productImages.some(img => !img.image || img.image === null || img.image === 'null');
      } catch (e) {
        return true; // Error parsing, needs re-sync
      }
    });
    
    console.log(`🔍 Found ${ordersWithMissingImages.length} orders with missing images`);
    
    if (ordersWithMissingImages.length === 0) {
      return res.json({
        success: true,
        message: 'No orders with missing images found',
        ordersChecked: orders?.length || 0,
        ordersUpdated: 0
      });
    }
    
    // Collect all product IDs from orders with missing images
    const allProductIds = [];
    const allVariantIds = [];
    
    ordersWithMissingImages.forEach(order => {
      try {
        const lineItems = typeof order.line_items === 'string' 
          ? JSON.parse(order.line_items) 
          : order.line_items;
        
        (lineItems || []).forEach(item => {
          if (item.product_id) allProductIds.push(item.product_id);
          if (item.variant_id) allVariantIds.push(item.variant_id);
        });
      } catch (e) {
        // Try from shopify_raw_data
        try {
          const rawData = typeof order.shopify_raw_data === 'string'
            ? JSON.parse(order.shopify_raw_data)
            : order.shopify_raw_data;
          
          (rawData?.line_items || []).forEach(item => {
            if (item.product_id) allProductIds.push(item.product_id);
            if (item.variant_id) allVariantIds.push(item.variant_id);
          });
        } catch (e2) {
          // Skip
        }
      }
    });
    
    // Fetch images for all products
    const uniqueProductIds = [...new Set(allProductIds)];
    const uniqueVariantIds = [...new Set(allVariantIds)];
    
    console.log(`📸 Fetching images for ${uniqueProductIds.length} unique products...`);
    
    let imageMap = {};
    if (uniqueProductIds.length > 0) {
      imageMap = await fetchProductImages(uniqueProductIds, uniqueVariantIds);
      console.log(`📸 Fetched ${Object.keys(imageMap).length} image mappings`);
    }
    
    // Update each order with the new images
    let updatedCount = 0;
    
    for (const order of ordersWithMissingImages) {
      try {
        // Get line items
        let lineItems = [];
        try {
          lineItems = typeof order.line_items === 'string' 
            ? JSON.parse(order.line_items) 
            : (order.line_items || []);
        } catch (e) {
          // Try from raw data
          try {
            const rawData = typeof order.shopify_raw_data === 'string'
              ? JSON.parse(order.shopify_raw_data)
              : order.shopify_raw_data;
            lineItems = rawData?.line_items || [];
          } catch (e2) {
            continue;
          }
        }
        
        // Generate new product_images
        const newProductImages = lineItems.map(item => {
          let imageUrl = null;
          
          // Try from image map first
          if (item.variant_id) {
            imageUrl = imageMap[Number(item.variant_id)] || imageMap[String(item.variant_id)] || imageMap[item.variant_id];
          }
          if (!imageUrl && item.product_id) {
            imageUrl = imageMap[Number(item.product_id)] || imageMap[String(item.product_id)] || imageMap[item.product_id];
          }
          
          // Try from line item data
          if (!imageUrl && item.image) {
            imageUrl = typeof item.image === 'string' ? item.image : (item.image?.src || item.image?.url);
          }
          if (!imageUrl && item.variant?.image) {
            imageUrl = typeof item.variant.image === 'string' ? item.variant.image : (item.variant.image?.src || item.variant.image?.url);
          }
          if (!imageUrl && item.variant?.featured_image) {
            imageUrl = item.variant.featured_image;
          }
          if (!imageUrl && item.images?.[0]) {
            imageUrl = typeof item.images[0] === 'string' ? item.images[0] : (item.images[0]?.src || item.images[0]?.url);
          }
          
          // Normalize URL
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            imageUrl = `https://cdn.shopify.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
          }
          
          return {
            product_id: item.product_id,
            variant_id: item.variant_id,
            image: imageUrl,
            title: item.title
          };
        });
        
        // Check if we have more images now
        const oldImagesCount = (() => {
          try {
            const old = typeof order.product_images === 'string' 
              ? JSON.parse(order.product_images) 
              : order.product_images;
            return (old || []).filter(img => img.image).length;
          } catch (e) {
            return 0;
          }
        })();
        
        const newImagesCount = newProductImages.filter(img => img.image).length;
        
        // Only update if we have more images
        if (newImagesCount > oldImagesCount) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({ product_images: newProductImages })
            .eq('id', order.id);
          
          if (!updateError) {
            updatedCount++;
            console.log(`✅ Updated order ${order.order_id}: ${oldImagesCount} -> ${newImagesCount} images`);
          }
        }
      } catch (e) {
        console.error(`❌ Error updating order ${order.order_id}:`, e.message);
      }
    }
    
    res.json({
      success: true,
      message: `Re-synced images for ${updatedCount} orders`,
      ordersChecked: orders?.length || 0,
      ordersWithMissingImages: ordersWithMissingImages.length,
      ordersUpdated: updatedCount,
      imagesFound: Object.keys(imageMap).length
    });
    
  } catch (error) {
    console.error('❌ Error re-syncing images:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/shopify/health', (req, res) => {
  const tokenPrefix = SHOPIFY_ACCESS_TOKEN ? SHOPIFY_ACCESS_TOKEN.substring(0, 10) + '...' : 'NOT SET';
  const tokenLength = SHOPIFY_ACCESS_TOKEN ? SHOPIFY_ACCESS_TOKEN.length : 0;
  const tokenStartsWithShpat = SHOPIFY_ACCESS_TOKEN ? SHOPIFY_ACCESS_TOKEN.startsWith('shpat_') : false;
  
  res.json({
    status: 'OK',
    shopify_configured: !!(SHOPIFY_STORE_URL && SHOPIFY_ACCESS_TOKEN),
    store_url: SHOPIFY_STORE_URL,
    access_token_prefix: tokenPrefix,
    access_token_length: tokenLength,
    token_format_valid: tokenStartsWithShpat,
    supabase_configured: !!(supabaseUrl && supabaseServiceKey),
    timestamp: new Date().toISOString(),
    issues: [
      !SHOPIFY_STORE_URL && 'SHOPIFY_STORE_URL is missing',
      !SHOPIFY_ACCESS_TOKEN && 'SHOPIFY_ACCESS_TOKEN is missing',
      SHOPIFY_ACCESS_TOKEN && !tokenStartsWithShpat && 'Access token should start with "shpat_"',
      SHOPIFY_ACCESS_TOKEN && tokenLength < 50 && 'Access token seems too short (should be ~70+ characters)',
    ].filter(Boolean),
  });
});

// Schedule sync every 5 minutes
// Cron format: '*/5 * * * *' means every 5 minutes
const SYNC_INTERVAL = '*/5 * * * *'; // Every 5 minutes

// Schedule periodic sync (every 5 minutes)
console.log('⏰ Scheduling Shopify sync every 5 minutes (last 24h updates)...');
nodeCron.schedule('*/5 * * * *', async () => {
  console.log(`\n⏰ Scheduled sync triggered at ${new Date().toISOString()}`);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await syncShopifyOrders(last24h);
});

// Run a full sync for very recent orders every 1 hour to catch any misses
nodeCron.schedule('0 * * * *', async () => {
  console.log(`\n⏰ Hourly deep sync triggered at ${new Date().toISOString()}`);
  const last7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await syncShopifyOrders(last7days);
});

// Run initial sync on startup (full sync)
console.log('🚀 Running initial Shopify full sync...');
syncShopifyOrders().then(() => {
  console.log('✅ Initial sync complete');
});

// Start server
const PORT = process.env.SHOPIFY_SYNC_PORT || 3002;
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log('🚀 SHOPIFY SYNC SERVER STARTED');
  console.log('🚀 ========================================');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🔄 Auto-sync: Every 5 minutes`);
  console.log(`🔗 Manual sync: http://localhost:${PORT}/api/shopify/sync`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/shopify/health`);
  console.log('========================================\n');
});

