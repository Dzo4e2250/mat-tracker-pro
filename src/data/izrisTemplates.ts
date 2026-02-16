/**
 * @file izrisTemplates.ts
 * @description Konfiguracija slik pozicij za izris
 */

export type MatType = 'MBW1' | 'MBW2' | 'MBW4' | 'custom';
export type Orientation = 'portret' | 'landscape';
export type LogoPosition = 'center' | 'top' | 'top-left' | 'top-right';

export interface TemplateImage {
  id: string;
  label: string;
  position: LogoPosition;
  path: string;
}

export interface TemplateConfig {
  matType: MatType;
  orientation: Orientation;
  images: TemplateImage[];
}

// Base path for images
const BASE_PATH = '/izris-templates';

// Template configurations
export const TEMPLATES: TemplateConfig[] = [
  // MBW1 - Portret
  {
    matType: 'MBW1',
    orientation: 'portret',
    images: [
      { id: 'mbw1-portret-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW1/portret-center.png` },
      { id: 'mbw1-portret-top', label: 'Top', position: 'top', path: `${BASE_PATH}/MBW1/portret-top.png` },
    ],
  },
  // MBW1 - Landscape
  {
    matType: 'MBW1',
    orientation: 'landscape',
    images: [
      { id: 'mbw1-landscape-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW1/landscape-center.png` },
    ],
  },
  // MBW2 - Portret
  {
    matType: 'MBW2',
    orientation: 'portret',
    images: [
      { id: 'mbw2-portret-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW2/portret-center.png` },
      { id: 'mbw2-portret-top', label: 'Top', position: 'top', path: `${BASE_PATH}/MBW2/portret-top.png` },
    ],
  },
  // MBW2 - Landscape
  {
    matType: 'MBW2',
    orientation: 'landscape',
    images: [
      { id: 'mbw2-landscape-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW2/landscape-center.png` },
    ],
  },
  // MBW4 - Portret
  {
    matType: 'MBW4',
    orientation: 'portret',
    images: [
      { id: 'mbw4-portret-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW4/portret-center.png` },
      { id: 'mbw4-portret-top', label: 'Top', position: 'top', path: `${BASE_PATH}/MBW4/portret-top.png` },
    ],
  },
  // MBW4 - Landscape
  {
    matType: 'MBW4',
    orientation: 'landscape',
    images: [
      { id: 'mbw4-landscape-center', label: 'Center', position: 'center', path: `${BASE_PATH}/MBW4/landscape-center.png` },
      { id: 'mbw4-landscape-top-left', label: 'Top Left', position: 'top-left', path: `${BASE_PATH}/MBW4/landscape-top-left.png` },
      { id: 'mbw4-landscape-top-right', label: 'Top Right', position: 'top-right', path: `${BASE_PATH}/MBW4/landscape-top-right.png` },
    ],
  },
  // Custom - Portret
  {
    matType: 'custom',
    orientation: 'portret',
    images: [
      { id: 'custom-portret-center', label: 'Center', position: 'center', path: `${BASE_PATH}/PORTRET/portret-center.png` },
      { id: 'custom-portret-top', label: 'Top', position: 'top', path: `${BASE_PATH}/PORTRET/portret-top.png` },
      { id: 'custom-portret-top-left', label: 'Top Left', position: 'top-left', path: `${BASE_PATH}/PORTRET/portret-top-left.png` },
      { id: 'custom-portret-top-right', label: 'Top Right', position: 'top-right', path: `${BASE_PATH}/PORTRET/portret-top-right.png` },
    ],
  },
  // Custom - Landscape
  {
    matType: 'custom',
    orientation: 'landscape',
    images: [
      { id: 'custom-landscape-center', label: 'Center', position: 'center', path: `${BASE_PATH}/LANDSCAPE/landscape-center.png` },
      { id: 'custom-landscape-top-left', label: 'Top Left', position: 'top-left', path: `${BASE_PATH}/LANDSCAPE/landscape-top-left.png` },
      { id: 'custom-landscape-top-right', label: 'Top Right', position: 'top-right', path: `${BASE_PATH}/LANDSCAPE/landscape-top-right.png` },
    ],
  },
];

// Helper to get templates for a specific mat type and orientation
export function getTemplates(matType: MatType, orientation: Orientation): TemplateImage[] {
  const config = TEMPLATES.find(t => t.matType === matType && t.orientation === orientation);
  return config?.images || [];
}

// Helper to get template by ID
export function getTemplateById(templateId: string): TemplateImage | undefined {
  for (const config of TEMPLATES) {
    const found = config.images.find(img => img.id === templateId);
    if (found) return found;
  }
  return undefined;
}
