export const businessTypeNames = {
  1: 'Bakery',
  2: 'Clothing',
  3: 'Restaurant',
  4: 'Flower Shop',
  5: 'Retail',
  6: 'Boutique',
}

export const getBusinessTypeName = (businessTypeId) =>
  businessTypeNames[businessTypeId] || `Business type ${businessTypeId}`
