import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { mockDrivers, EL_SALVADOR_CENTER } from '../data/mock';
import { MapMarker } from '../types';
import { DemandZone } from '../types/models';

export interface MapRoute {
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}

type Props = {
  markers?: MapMarker[];
  route?: MapRoute;
  showNearbyDrivers?: boolean;
  showDemandHeatmap?: boolean;
  demandZones?: DemandZone[];
  interactive?: boolean;
};

function buildMapHtml(
  markers: MapMarker[],
  route?: MapRoute,
  showNearbyDrivers = false,
  demandZones: DemandZone[] = []
): string {
  const driverMarkers = showNearbyDrivers
    ? mockDrivers.map((driver) => ({
        id: driver.id,
        latitude: driver.coordinates.latitude,
        longitude: driver.coordinates.longitude,
        type: 'driver',
        label: driver.unit,
      }))
    : [];

  const payload = JSON.stringify({
    center: EL_SALVADOR_CENTER,
    markers: [...markers, ...driverMarkers],
    route: route ?? null,
    demandZones,
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
    .marker {
      width: 16px; height: 16px; border-radius: 50%;
      border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
    .marker-origin { background: #111; }
    .marker-destination { background: #111; border-radius: 2px; transform: rotate(45deg); }
    .marker-user { background: #2563EB; width: 18px; height: 18px; }
    .marker-driver { background: #E53935; width: 14px; height: 14px; }
    .driver-label {
      background: #fff; color: #111;
      font: 600 10px -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 2px 6px; border-radius: 999px; margin-top: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15); white-space: nowrap;
    }
    .zone-label {
      background: rgba(255,255,255,0.92); color: #111;
      font: 600 11px -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 3px 8px; border-radius: 6px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.12); white-space: nowrap;
      pointer-events: none;
    }
    .map-legend {
      position: absolute; bottom: 12px; left: 12px; z-index: 2;
      background: rgba(255,255,255,0.94); border-radius: 8px;
      padding: 8px 10px; font: 11px -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .map-legend-title { font-weight: 600; margin-bottom: 6px; color: #333; }
    .map-legend-row { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: #555; }
    .map-legend-swatch { width: 10px; height: 10px; border-radius: 50%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="heatmap-legend" class="map-legend" style="display:none">
    <div class="map-legend-title">Hotspots</div>
    <div class="map-legend-row"><span class="map-legend-swatch" style="background:rgba(229,57,53,0.85)"></span> Alta</div>
    <div class="map-legend-row"><span class="map-legend-swatch" style="background:rgba(255,152,0,0.85)"></span> Media</div>
    <div class="map-legend-row"><span class="map-legend-swatch" style="background:rgba(76,175,80,0.85)"></span> Baja</div>
  </div>
  <script>
    const data = ${payload};

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

    function markerClass(type) {
      if (type === 'origin') return 'marker marker-origin';
      if (type === 'destination') return 'marker marker-destination';
      if (type === 'user') return 'marker marker-user';
      return 'marker marker-driver';
    }

    map.on('load', () => {
      if (data.demandZones && data.demandZones.length) {
        const features = data.demandZones.map((z) => ({
          type: 'Feature',
          properties: { intensity: z.intensity, label: z.label },
          geometry: {
            type: 'Point',
            coordinates: [z.longitude, z.latitude]
          }
        }));
        map.addSource('demand', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features }
        });
        map.addLayer({
          id: 'demand-heat',
          type: 'circle',
          source: 'demand',
          paint: {
            'circle-radius': [
              'match', ['get', 'intensity'],
              'high', 58,
              'medium', 42,
              30
            ],
            'circle-color': [
              'match', ['get', 'intensity'],
              'high', 'rgba(229, 57, 53, 0.5)',
              'medium', 'rgba(255, 152, 0, 0.4)',
              'rgba(76, 175, 80, 0.3)'
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': [
              'match', ['get', 'intensity'],
              'high', 'rgba(229, 57, 53, 0.7)',
              'medium', 'rgba(255, 152, 0, 0.6)',
              'rgba(76, 175, 80, 0.5)'
            ],
            'circle-blur': 0.55
          }
        });
        const legend = document.getElementById('heatmap-legend');
        if (legend) legend.style.display = 'block';
        data.demandZones.forEach((z) => {
          const el = document.createElement('div');
          el.className = 'zone-label';
          el.textContent = z.label;
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([z.longitude, z.latitude])
            .addTo(map);
        });
      }

      data.markers.forEach((marker) => {
        const el = document.createElement('div');
        el.className = markerClass(marker.type);
        if (marker.type === 'driver' && marker.label) {
          const wrap = document.createElement('div');
          wrap.style.display = 'flex';
          wrap.style.flexDirection = 'column';
          wrap.style.alignItems = 'center';
          wrap.appendChild(el);
          const label = document.createElement('div');
          label.className = 'driver-label';
          label.textContent = marker.label;
          wrap.appendChild(label);
          new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
            .setLngLat([marker.longitude, marker.latitude])
            .addTo(map);
          return;
        }
        new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([marker.longitude, marker.latitude])
          .addTo(map);
      });

      if (data.route) {
        const coordinates = [
          [data.route.origin.longitude, data.route.origin.latitude],
          [data.route.destination.longitude, data.route.destination.latitude]
        ];
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates } }
        });
        map.addLayer({
          id: 'route-line', type: 'line', source: 'route',
          paint: { 'line-color': '#111111', 'line-width': 4, 'line-opacity': 0.85 }
        });
        const bounds = coordinates.reduce(
          (b, coord) => b.extend(coord),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
      }
    });
  </script>
</body>
</html>`;
}

export function MoviMapView({
  markers = [],
  route,
  showNearbyDrivers = false,
  showDemandHeatmap = false,
  demandZones = [],
  interactive = true,
}: Props) {
  const html = buildMapHtml(
    markers,
    route,
    showNearbyDrivers,
    showDemandHeatmap ? demandZones : []
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        pointerEvents={interactive ? 'auto' : 'none'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#E8EDDF' },
});
