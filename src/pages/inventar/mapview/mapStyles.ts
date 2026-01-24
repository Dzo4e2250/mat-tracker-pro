export const MAP_STYLES = `
  .custom-marker {
    background: transparent !important;
    border: none !important;
  }

  .marker-container {
    position: relative;
  }

  .marker-pulse::before {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    top: 0;
    left: 0;
    background-color: rgba(59, 130, 246, 0.4);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(2);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }

  .custom-cluster {
    background: transparent !important;
    border: none !important;
  }

  .cluster-marker {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 14px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    border: 2px solid white;
  }

  .leaflet-popup-content-wrapper {
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .leaflet-popup-content {
    margin: 8px 12px;
  }
`;

// Slovenia center coordinates
export const SLOVENIA_CENTER: [number, number] = [46.1512, 14.9955];
export const DEFAULT_ZOOM = 8;
