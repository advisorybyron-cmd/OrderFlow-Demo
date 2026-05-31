export interface ShipStationOrder {
  orderId: number
  orderNumber: string
  orderKey: string
  orderDate: string
  createDate: string
  modifyDate: string
  paymentDate: string
  shipByDate: string
  orderStatus: string
  customerId: number
  customerUsername: string
  customerEmail: string
  billTo: ShipStationAddress
  shipTo: ShipStationAddress
  items: ShipStationOrderItem[]
  orderTotal: number
  amountPaid: number
  taxAmount: number
  shippingAmount: number
  customerNotes: string
  internalNotes: string
  gift: boolean
  giftMessage: string
  paymentMethod: string
  requestedShippingService: string
  carrierCode: string
  serviceCode: string
  packageCode: string
  confirmation: string
  shipDate: string
  holdUntilDate: string | null
  weight: ShipStationWeight
  dimensions: ShipStationDimensions | null
  insuranceOptions: ShipStationInsuranceOptions | null
  internationalOptions: ShipStationInternationalOptions | null
  advancedOptions: ShipStationAdvancedOptions | null
  tagIds: number[] | null
  userId: string | null
  externallyFulfilled: boolean
  externallyFulfilledBy: string | null
}

export interface ShipStationOrderItem {
  orderItemId: number
  lineItemKey: string | null
  sku: string
  name: string
  imageUrl: string | null
  weight: ShipStationWeight | null
  quantity: number
  unitPrice: number
  taxAmount: number | null
  shippingAmount: number | null
  warehouseLocation: string | null
  options: ShipStationItemOption[]
  productId: number | null
  fulfillmentSku: string | null
  adjustment: boolean
  upc: string | null
  createDate: string
  modifyDate: string
}

export interface ShipStationItemOption {
  name: string
  value: string
}

export interface ShipStationAddress {
  name: string
  company: string | null
  street1: string
  street2: string | null
  street3: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
  residential: boolean | null
  addressVerified: string | null
}

export interface ShipStationWeight {
  value: number
  units: string
  WeightUnits?: number
}

export interface ShipStationDimensions {
  units: string
  length: number
  width: number
  height: number
}

export interface ShipStationInsuranceOptions {
  provider: string | null
  insureShipment: boolean
  insuredValue: number
}

export interface ShipStationInternationalOptions {
  contents: string | null
  customsItems: unknown[] | null
  nonDelivery: string | null
}

export interface ShipStationAdvancedOptions {
  warehouseId: number | null
  nonMachinable: boolean
  saturdayDelivery: boolean
  containsAlcohol: boolean
  storeId: number | null
  customField1: string | null
  customField2: string | null
  customField3: string | null
  source: string | null
  mergedOrSplit: boolean
  mergedIds: number[] | null
  parentId: number | null
  billToParty: string | null
  billToAccount: string | null
  billToPostalCode: string | null
  billToCountryCode: string | null
}

export interface ShipStationOrdersResponse {
  orders: ShipStationOrder[]
  total: number
  page: number
  pages: number
}
