import { EL_SALVADOR_CENTER } from '../../data/mock';
import type { LiveDriver } from '../../types/operationsLive';
import type { MapMarker } from '../../types';

export type LiveTrackingMapHandle = {
  updateDriver: (driver: LiveDriver) => void;
};

/** HTML MapLibre map shared by native WebView and web iframe. */
export function buildLiveMapHtml(staticMarkers: MapMarker[]): string {
  const payload = JSON.stringify({
    center: EL_SALVADOR_CENTER,
    staticMarkers,
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .marker-driver { width: 14px; height: 14px; border-radius: 50%; background: #E53935; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
    .marker-origin { width: 16px; height: 16px; border-radius: 50%; background: #111; border: 3px solid #fff; }
    .marker-destination { width: 16px; height: 16px; background: #111; border: 3px solid #fff; transform: rotate(45deg); }
    .driver-label {
      background: #fff; color: #111;
      font: 600 10px -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 2px 6px; border-radius: 999px; margin-top: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15); white-space: nowrap;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const data = ${payload};
    const driverMarkers = new Map();

    const map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap'
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      },
      center: [data.center.longitude, data.center.latitude],
      zoom: 12,
      minZoom: 7,
      maxZoom: 18,
      maxBounds: [[-90.5, 12.8], [-87.2, 14.8]]
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    function postDriverSelect(driverId) {
      const msg = JSON.stringify({ type: 'driver_select', driverId });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }

    function animateMarker(marker, toLng, toLat, durationMs) {
      const from = marker.getLngLat();
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const lng = from.lng + (toLng - from.lng) * t;
        const lat = from.lat + (toLat - from.lat) * t;
        marker.setLngLat([lng, lat]);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function createDriverElement(driver) {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.cursor = 'pointer';

      const dot = document.createElement('div');
      dot.className = 'marker-driver';
      wrap.appendChild(dot);

      const label = document.createElement('div');
      label.className = 'driver-label';
      label.textContent = driver.busy
        ? (driver.name.split(' ')[0] + ' · viaje')
        : driver.name.split(' ')[0];
      wrap.appendChild(label);

      wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        postDriverSelect(driver.driverId);
      });

      return wrap;
    }

    function addDriverMarker(driver) {
      const el = createDriverElement(driver);
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([driver.longitude, driver.latitude])
        .addTo(map);
      driverMarkers.set(driver.driverId, { marker, el, driver });
    }

    window.moviUpdateDriver = function(payload) {
      const entry = driverMarkers.get(payload.driverId);
      if (!entry) {
        addDriverMarker(payload);
        return;
      }
      const label = entry.el.querySelector('.driver-label');
      if (label) {
        label.textContent = payload.busy
          ? (payload.name.split(' ')[0] + ' · viaje')
          : payload.name.split(' ')[0];
      }
      entry.driver = payload;
      animateMarker(entry.marker, payload.longitude, payload.latitude, 480);
    };

    map.on('load', () => {
      data.staticMarkers.forEach((marker) => {
        const el = document.createElement('div');
        el.className = marker.type === 'destination' ? 'marker-destination' : 'marker-origin';
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([marker.longitude, marker.latitude])
          .addTo(map);
      });
    });
  </script>
</body>
</html>`;
}

export function parseDriverSelectMessage(raw: string): string | null {
  try {
    const data = JSON.parse(raw) as { type?: string; driverId?: string };
    if (data.type === 'driver_select' && data.driverId) {
      return data.driverId;
    }
  } catch {
    /* ignore */
  }
  return null;
}
