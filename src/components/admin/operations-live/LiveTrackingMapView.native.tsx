import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
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

export const LiveTrackingMapView = forwardRef<LiveTrackingMapHandle, Props>(
  function LiveTrackingMapView({ drivers, staticMarkers, onDriverSelect }, ref) {
    const webRef = useRef<WebView>(null);
    const html = useMemo(() => buildLiveMapHtml(staticMarkers), [staticMarkers]);
    const seededRef = useRef(false);

    useEffect(() => {
      seededRef.current = false;
    }, [staticMarkers]);

    const pushDriverUpdate = useCallback((driver: LiveDriver) => {
      if (driver.latitude == null || driver.longitude == null) return;
      const script = `window.moviUpdateDriver && window.moviUpdateDriver(${JSON.stringify(driver)}); true;`;
      webRef.current?.injectJavaScript(script);
    }, []);

    useImperativeHandle(ref, () => ({
      updateDriver: pushDriverUpdate,
    }));

    const onMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const driverId = parseDriverSelectMessage(event.nativeEvent.data);
        if (driverId) onDriverSelect?.(driverId);
      },
      [onDriverSelect]
    );

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
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          onLoadEnd={seedDrivers}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: '#E8EDDF' },
});
