/**
 * @file supplierColors.ts
 * @description Barve dobaviteljev za izris predpražnikov
 */

export type Supplier = 'mount_will' | 'emco' | 'kleen_tex';
export type OrderType = 'najem' | 'nakup';

export interface ColorOption {
  code: string;
  name: string;
}

export interface ColorCategory {
  name: string;
  colors: ColorOption[];
}

export interface SupplierConfig {
  id: Supplier;
  name: string;
  orderTypes: OrderType[];  // Možne vrste naročila
  defaultOrderType: OrderType;
  hasCategories: boolean;
  categories?: ColorCategory[];
  colors?: string[];  // Za Kleen-Tex - samo številke
}

// Mount Will barve - segmentirane po kategorijah
const MOUNT_WILL_CATEGORIES: ColorCategory[] = [
  {
    name: 'Greys (Siva)',
    colors: [
      { code: 'C01', name: 'White' },
      { code: 'C02', name: 'Light Grey' },
      { code: 'C03', name: 'Mid Grey' },
      { code: 'C04', name: 'Dark Grey' },
      { code: 'C05', name: 'Anthracite' },
      { code: 'C06', name: 'Black' },
      { code: 'C07', name: 'Cool Anthracite' },
      { code: 'C08', name: 'Cool Grey' },
      { code: 'C61', name: 'Charcoal' },
      { code: 'C62', name: 'Dark Ash' },
      { code: 'C63', name: 'Grey Ash' },
      { code: 'C64', name: 'Light Ash' },
      { code: 'C65', name: 'Warm Grey' },
    ],
  },
  {
    name: 'Oranges (Oranžna)',
    colors: [
      { code: 'C09', name: 'Orange' },
      { code: 'C10', name: 'Light Orange' },
      { code: 'C50', name: 'Soft Orange' },
    ],
  },
  {
    name: 'Yellows (Rumena)',
    colors: [
      { code: 'C11', name: 'Gold' },
      { code: 'C12', name: 'Yellow' },
      { code: 'C13', name: 'Lemon' },
      { code: 'C55', name: 'Light Yellow' },
      { code: 'C58', name: 'Bright Gold' },
    ],
  },
  {
    name: 'Greens (Zelena)',
    colors: [
      { code: 'C14', name: 'Limegreen' },
      { code: 'C15', name: 'Dark Green' },
      { code: 'C16', name: 'Olive' },
      { code: 'C17', name: 'Grass Green' },
      { code: 'C18', name: 'Glen Green' },
      { code: 'C19', name: 'Forest Green' },
      { code: 'C56', name: 'Cactus' },
      { code: 'C66', name: 'Light Green' },
    ],
  },
  {
    name: 'Blues (Modra)',
    colors: [
      { code: 'C20', name: 'Turquoise' },
      { code: 'C21', name: 'Sea Blue' },
      { code: 'C22', name: 'Cobalt Blue' },
      { code: 'C23', name: 'Marine Blue' },
      { code: 'C24', name: 'Lagoon Blue' },
      { code: 'C25', name: 'Sky Blue' },
      { code: 'C26', name: 'Light Blue' },
      { code: 'C27', name: 'Mid Blue' },
      { code: 'C28', name: 'Royal Blue' },
      { code: 'C29', name: 'Navy' },
      { code: 'C30', name: 'Deep Blue' },
      { code: 'C57', name: 'Mint' },
      { code: 'C59', name: 'Azure' },
    ],
  },
  {
    name: 'Violets (Vijolična)',
    colors: [
      { code: 'C31', name: 'Purple' },
      { code: 'C32', name: 'Dark Purple' },
      { code: 'C48', name: 'Violet' },
      { code: 'C60', name: 'Lavender' },
    ],
  },
  {
    name: 'Reds (Rdeča)',
    colors: [
      { code: 'C33', name: 'Burgundy' },
      { code: 'C34', name: 'Wine' },
      { code: 'C35', name: 'Dark Fuchsia' },
      { code: 'C36', name: 'Fuchsia' },
      { code: 'C37', name: 'Hot Pink' },
      { code: 'C38', name: 'Bright Red' },
      { code: 'C39', name: 'Red' },
      { code: 'C40', name: 'Ruby' },
      { code: 'C41', name: 'Brick Red' },
      { code: 'C49', name: 'Peach' },
      { code: 'C51', name: 'Pink' },
      { code: 'C52', name: 'Raspberry' },
      { code: 'C53', name: 'Coral' },
      { code: 'C54', name: 'Salmon' },
    ],
  },
  {
    name: 'Browns (Rjava)',
    colors: [
      { code: 'C42', name: 'Chocolate' },
      { code: 'C43', name: 'Walnut' },
      { code: 'C44', name: 'Brown' },
      { code: 'C45', name: 'Sandalwood' },
      { code: 'C46', name: 'Taupe' },
      { code: 'C47', name: 'Light Beige' },
    ],
  },
];

// EMCO barve - segmentirane po kodah
const EMCO_CATEGORIES: ColorCategory[] = [
  {
    name: 'Rdeči (01.xx)',
    colors: [
      { code: '01.100.S', name: 'Violet red' },
      { code: '01.110.B', name: 'Magenta' },
      { code: '01.170.B', name: 'Oxide red' },
      { code: '01.20.B', name: 'Light purple' },
      { code: '01.30.S', name: 'Bright ruby red' },
      { code: '01.40.B', name: 'Red' },
      { code: '01.60.B', name: 'Bordeaux' },
    ],
  },
  {
    name: 'Sivi (02.xx)',
    colors: [
      { code: '02.130.B', name: 'Charcoal' },
      { code: '02.170.B', name: 'Light gray' },
      { code: '02.20.B', name: 'Silver gray' },
      { code: '02.220.B', name: 'Wheat' },
      { code: '02.230.B', name: 'Brown-gray' },
      { code: '02.30.B', name: 'Light brilliant blue' },
      { code: '02.40.B', name: 'Light gray' },
      { code: '02.50.B', name: 'Gray' },
      { code: '02.60.B', name: 'Steel gray' },
      { code: '02.70.B', name: 'Dark gray' },
      { code: '02.80.B', name: 'Black' },
    ],
  },
  {
    name: 'Rjavi (03.xx)',
    colors: [
      { code: '03.100.B', name: 'Dark brown' },
      { code: '03.140.B', name: 'Pale brown' },
      { code: '03.150.B', name: 'Terra brown' },
      { code: '03.160.B', name: 'Grey-beige' },
      { code: '03.170.B', name: 'Aniline Mauve' },
      { code: '03.200.B', name: 'Sand' },
      { code: '03.210.B', name: 'Deer brown' },
      { code: '03.240.B', name: 'Peach' },
      { code: '03.260.S', name: 'Terracotta' },
      { code: '03.270.B', name: 'Brown-red' },
      { code: '03.280.B', name: 'Dark oxide red' },
      { code: '03.50.B', name: 'Burlywood' },
      { code: '03.60.B', name: 'Brown beige' },
      { code: '03.80.B', name: 'Clay brown' },
    ],
  },
  {
    name: 'Vijolični (04.xx)',
    colors: [
      { code: '04.10.S', name: 'Thistle' },
      { code: '04.110.S', name: 'Lilac' },
      { code: '04.20.B', name: 'Mauve' },
      { code: '04.40.B', name: 'Bright signal violet' },
      { code: '04.60.S', name: 'Byzantium' },
      { code: '04.90.B', name: 'Lavender Blue' },
    ],
  },
  {
    name: 'Rumeni/Oranžni (05.xx)',
    colors: [
      { code: '05.150.B', name: 'Yellow' },
      { code: '05.170.B', name: 'Dark Orange' },
      { code: '05.180.B', name: 'Traffic red' },
      { code: '05.190.S', name: 'Oriental red' },
      { code: '05.20.B', name: 'Luminary Green' },
      { code: '05.210.S', name: 'Pumpkin Orange' },
      { code: '05.220.B', name: 'Orange' },
      { code: '05.240.B', name: 'Light ivory' },
      { code: '05.260.B', name: 'Light brown' },
      { code: '05.270.S', name: 'Bamboo brown' },
      { code: '05.330.B', name: 'Light Orange' },
      { code: '05.40.B', name: 'Lemon' },
      { code: '05.70.B', name: 'Ginstergelb' },
      { code: '05.80.B', name: 'Honey yellow' },
    ],
  },
  {
    name: 'Modri (06.xx)',
    colors: [
      { code: '06.120.S', name: 'Petrol' },
      { code: '06.130.S', name: 'Bahama Blue' },
      { code: '06.140.B', name: 'Cobalt Blue' },
      { code: '06.160.B', name: 'SkyBlue' },
      { code: '06.180.S', name: 'Distant blue' },
      { code: '06.20.B', name: 'Light sky blue' },
      { code: '06.200.S', name: 'Light sapphire blue' },
      { code: '06.270.B', name: 'Mint' },
      { code: '06.280.B', name: 'Emerald' },
      { code: '06.30.B', name: 'Light Blue' },
      { code: '06.40.B', name: 'Light blue' },
      { code: '06.60.B', name: 'Ultramarine blue' },
      { code: '06.70.S', name: 'Navy blue' },
      { code: '06.80.B', name: 'MidnightBlue' },
    ],
  },
  {
    name: 'Zeleni (07.xx)',
    colors: [
      { code: '07.10.B', name: 'Green beige' },
      { code: '07.160.S', name: 'Reseda green' },
      { code: '07.180.B', name: 'Hunter Green' },
      { code: '07.190.B', name: 'Pear' },
      { code: '07.220.S', name: 'Olive green' },
      { code: '07.230.S', name: 'May green' },
      { code: '07.280.S', name: 'Pistachio' },
      { code: '07.50.B', name: 'Pastel Green' },
      { code: '07.60.S', name: 'Reed green' },
      { code: '07.70.B', name: 'Foliage green' },
      { code: '07.90.B', name: 'Dark green' },
    ],
  },
  {
    name: 'Mix (08.xx)',
    colors: [
      { code: '08.10.B', name: 'Mix Beige' },
      { code: '08.20.B', name: 'Mix Grey' },
    ],
  },
];

// Kleen-Tex - samo številke
const KLEEN_TEX_COLORS = [
  '600', '601', '602', '603', '604', '605', '606', '607', '608', '609',
  '610', '611', '612', '613', '614', '615', '616', '617', '618', '619',
  '620', '621', '622', '623', '624', '625', '626', '627', '628', '629',
  '630', '631', '632', '633', '634', '635', '636', '637', '638', '639',
  '640', '641', '642', '643', '644', '645', '646', '647', '648', '649',
  '650', '651', '652', '653', '654', '655', '656', '657', '658', '659',
  '660', '661', '662', '663', '664', '665', '666',
  '901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911', '912',
];

// Supplier configurations
export const SUPPLIERS: SupplierConfig[] = [
  {
    id: 'mount_will',
    name: 'Mount Will',
    orderTypes: ['najem', 'nakup'],
    defaultOrderType: 'najem',
    hasCategories: true,
    categories: MOUNT_WILL_CATEGORIES,
  },
  {
    id: 'emco',
    name: 'EMCO',
    orderTypes: ['najem'],
    defaultOrderType: 'najem',
    hasCategories: true,
    categories: EMCO_CATEGORIES,
  },
  {
    id: 'kleen_tex',
    name: 'Kleen-Tex',
    orderTypes: ['nakup'],
    defaultOrderType: 'nakup',
    hasCategories: false,
    colors: KLEEN_TEX_COLORS,
  },
];

// Helper to get supplier by ID
export function getSupplier(id: Supplier): SupplierConfig | undefined {
  return SUPPLIERS.find(s => s.id === id);
}

// Helper to get all colors flat (for search)
export function getAllColorsForSupplier(supplierId: Supplier): ColorOption[] {
  const supplier = getSupplier(supplierId);
  if (!supplier) return [];

  if (supplier.hasCategories && supplier.categories) {
    return supplier.categories.flatMap(cat => cat.colors);
  }

  if (supplier.colors) {
    return supplier.colors.map(code => ({ code, name: code }));
  }

  return [];
}

// Standard MBW dimensions
export const MBW_SIZES = [
  { code: 'MBW1', dimensions: '85x150', width: 85, height: 150 },
  { code: 'MBW2', dimensions: '115x200', width: 115, height: 200 },
  { code: 'MBW4', dimensions: '150x300', width: 150, height: 300 },
];

// Get title prefix based on order type
export function getTitlePrefix(orderType: OrderType): string {
  return orderType === 'najem' ? 'DESIGN' : 'PROMO';
}
