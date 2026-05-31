// Demo orders with realistic t-shirt product data
import type { ShipStationOrder, OrderItem } from '@/lib/shipstation/types'

const DEMO_DESIGNS = [
  { name: 'Vintage Sunset', sku: 'TS-SUNSET-001', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop' },
  { name: 'Mountain Adventure', sku: 'TS-MTN-002', imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop' },
  { name: 'Retro Gaming', sku: 'TS-GAME-003', imageUrl: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop' },
  { name: 'Coffee Lover', sku: 'TS-COFFEE-004', imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop' },
  { name: 'Beach Vibes', sku: 'TS-BEACH-005', imageUrl: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop' },
  { name: 'Space Explorer', sku: 'TS-SPACE-006', imageUrl: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=400&h=400&fit=crop' },
  { name: 'Floral Dreams', sku: 'TS-FLORAL-007', imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop' },
  { name: 'Urban Street', sku: 'TS-URBAN-008', imageUrl: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&h=400&fit=crop' },
  { name: 'Nature Wild', sku: 'TS-WILD-009', imageUrl: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop' },
  { name: 'Minimalist Art', sku: 'TS-MIN-010', imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400&h=400&fit=crop' },
]

const DEMO_COLORS = ['Black', 'White', 'Navy Blue', 'Heather Gray', 'Forest Green', 'Burgundy', 'Royal Blue', 'Charcoal']
const DEMO_SIZES = ['Small', 'Medium', 'Large', 'XL', '2XL', '3XL']
const DEMO_PRODUCT_TYPES = ["Men's T-Shirt", "Women's T-Shirt", "Unisex T-Shirt", "Youth T-Shirt", "Tank Top", "Hoodie"]

const DEMO_CUSTOMERS = [
  { name: 'James Wilson', city: 'Austin', state: 'TX', country: 'US' },
  { name: 'Maria Garcia', city: 'Los Angeles', state: 'CA', country: 'US' },
  { name: 'David Chen', city: 'Seattle', state: 'WA', country: 'US' },
  { name: 'Emma Thompson', city: 'Chicago', state: 'IL', country: 'US' },
  { name: 'Michael Brown', city: 'Miami', state: 'FL', country: 'US' },
  { name: 'Sophie Miller', city: 'Denver', state: 'CO', country: 'US' },
  { name: 'Robert Taylor', city: 'Portland', state: 'OR', country: 'US' },
  { name: 'Jennifer Lee', city: 'Boston', state: 'MA', country: 'US' },
  { name: 'William Davis', city: 'Phoenix', state: 'AZ', country: 'US' },
  { name: 'Ashley Martinez', city: 'San Diego', state: 'CA', country: 'US' },
  { name: 'Chris Anderson', city: 'Nashville', state: 'TN', country: 'US' },
  { name: 'Amanda White', city: 'Atlanta', state: 'GA', country: 'US' },
  { name: 'Daniel Harris', city: 'Dallas', state: 'TX', country: 'US' },
  { name: 'Nicole Clark', city: 'Minneapolis', state: 'MN', country: 'US' },
  { name: 'Kevin Robinson', city: 'Charlotte', state: 'NC', country: 'US' },
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateOrderNumber(): string {
  return `DEMO-${Math.floor(10000 + Math.random() * 90000)}`
}

function generateItems(count: number): OrderItem[] {
  const items: OrderItem[] = []
  for (let i = 0; i < count; i++) {
    const design = randomItem(DEMO_DESIGNS)
    const color = randomItem(DEMO_COLORS)
    const size = randomItem(DEMO_SIZES)
    const productType = randomItem(DEMO_PRODUCT_TYPES)
    const quantity = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1
    
    items.push({
      orderItemId: Math.floor(Math.random() * 1000000),
      lineItemKey: `item-${i}`,
      sku: design.sku,
      name: design.name,
      imageUrl: design.imageUrl,
      quantity,
      unitPrice: 24.99,
      options: [
        { name: 'Size', value: size },
        { name: 'Color', value: color },
        { name: 'Product Type', value: productType },
      ],
    })
  }
  return items
}

export function generateDemoOrder(orderNumberOverride?: string): ShipStationOrder {
  const customer = randomItem(DEMO_CUSTOMERS)
  const itemCount = Math.floor(Math.random() * 8) + 1
  const items = generateItems(itemCount)
  const orderNumber = orderNumberOverride || generateOrderNumber()
  
  const now = new Date()
  const orderDate = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  
  return {
    orderId: Math.floor(Math.random() * 10000000),
    orderNumber,
    orderKey: `key-${orderNumber}`,
    orderDate: orderDate.toISOString(),
    createDate: orderDate.toISOString(),
    modifyDate: now.toISOString(),
    paymentDate: orderDate.toISOString(),
    shipByDate: new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    orderStatus: 'awaiting_shipment',
    customerUsername: customer.name.toLowerCase().replace(' ', '.'),
    customerEmail: `${customer.name.toLowerCase().replace(' ', '.')}@example.com`,
    billTo: {
      name: customer.name,
      company: null,
      street1: '123 Demo Street',
      street2: null,
      street3: null,
      city: customer.city,
      state: customer.state,
      postalCode: '12345',
      country: customer.country,
      phone: '555-0100',
      residential: true,
    },
    shipTo: {
      name: customer.name,
      company: null,
      street1: '123 Demo Street',
      street2: null,
      street3: null,
      city: customer.city,
      state: customer.state,
      postalCode: '12345',
      country: customer.country,
      phone: '555-0100',
      residential: true,
    },
    items,
    orderTotal: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
    amountPaid: items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0),
    taxAmount: 0,
    shippingAmount: 5.99,
    customerNotes: null,
    internalNotes: null,
    gift: false,
    giftMessage: null,
    paymentMethod: 'Credit Card',
    requestedShippingService: 'USPS Priority Mail',
    carrierCode: 'usps',
    serviceCode: 'usps_priority_mail',
    packageCode: 'package',
    confirmation: 'delivery',
    shipDate: null,
    holdUntilDate: null,
    weight: { value: itemCount * 0.5, units: 'pounds', WeightUnits: 1 },
    dimensions: null,
    insuranceOptions: { provider: null, insureShipment: false, insuredValue: 0 },
    internationalOptions: { contents: null, customsItems: null, nonDelivery: null },
    advancedOptions: {
      warehouseId: 12345,
      nonMachinable: false,
      saturdayDelivery: false,
      containsAlcohol: false,
      mergedOrSplit: false,
      mergedIds: [],
      parentId: null,
      storeId: 12345,
      customField1: null,
      customField2: null,
      customField3: null,
      source: 'Demo Store',
      billToParty: null,
      billToAccount: null,
      billToPostalCode: null,
      billToCountryCode: null,
    },
    tagIds: null,
    userId: null,
    externallyFulfilled: false,
    externallyFulfilledBy: null,
  }
}

// Generate a batch of demo orders
export function generateDemoOrders(count: number): ShipStationOrder[] {
  const orders: ShipStationOrder[] = []
  for (let i = 0; i < count; i++) {
    orders.push(generateDemoOrder())
  }
  return orders
}

// Pre-generated static orders for consistent demo experience
let _cachedOrders: ShipStationOrder[] | null = null

export function getDemoOrders(): ShipStationOrder[] {
  if (!_cachedOrders) {
    _cachedOrders = generateDemoOrders(25)
  }
  return _cachedOrders
}

export function getDemoOrderByNumber(orderNumber: string): ShipStationOrder | null {
  const orders = getDemoOrders()
  const existing = orders.find(o => o.orderNumber === orderNumber)
  if (existing) return existing
  
  // Generate a new order with this number if not found
  return generateDemoOrder(orderNumber)
}
