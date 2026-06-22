import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  createElement,
} from 'react';
import { StyleSheet, View } from 'react-native';
import type { LiveDriver } from '../../../types/operationsLive';
import type { MapMarker } from '../../../types';
import {
  buildLiveMapHtml,
  parseDriverSelectMessage,
  type LiveTrackingMapHandle,
} from '../../../shared/operations-live/liveMapCore';

export type { LiveTrackingMapHandle };

type Props = {
  drivers: LiveDriver[];
  staticMarkers: MapMarker[];
  onDriverSelect?: (driverId: string) => void;
};

type LiveMapWindow = Window & {
  moviUpdateDriver?: (driver: LiveDriver) => void;
};

export const LiveTrackingMapView = forwardRef<LiveTrackingMapHandle, Props>(
  function LiveTrackingMapView({ drivers, staticMarkers, onDriverSelect }, ref) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const html = useMemo(() => buildLiveMapHtml(staticMarkers), [staticMarkers]);
    const seededRef = useRef(false);

    useEffect(() => {
      seededRef.current = false;
    }, [staticMarkers]);

    useEffect(() => {
      const handler = (event: MessageEvent) => {
        if (typeof event.data !== 'string') return;
        const driverId = parseDriverSelectMessage(event.data);
        if (driverId) onDriverSelect?.(driverId);
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [onDriverSelect]);

    const pushDriverUpdate = useCallback((driver: LiveDriver) => {
      if (driver.latitude == null || driver.longitude == null) return;
      const mapWindow = iframeRef.current?.contentWindow as LiveMapWindow | null;
      mapWindow?.moviUpdateDriver?.(driver);
    }, []);

    useImperativeHandle(ref, () => ({
      updateDriver: pushDriverUpdate,
    }));

    const seedDrivers = useCallback(() => {
      if (seededRef.current) return;
      seededRef.current = true;
      drivers.forEach((driver) => {
        if (driver.latitude != null && driver.longitude != null) {
          pushDriverUpdate(driver);
        }
      });
    }, [drivers, pushDriverUpdate]);

    return (
      <View style={styles.container}>
        {createElement('iframe', {
          ref: iframeRef,
          srcDoc: html,
          title: 'Operations live map',
          sandbox: 'allow-scripts allow-same-origin',
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
            backgroundColor: '#E8EDDF',
          },
          onLoad: seedDrivers,
        })}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
