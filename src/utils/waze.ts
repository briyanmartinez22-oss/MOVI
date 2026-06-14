import { Linking, Platform } from 'react-native';
import { Coordinates } from '../types';
import { parseCoordinates } from './parseCoordinates';

/** Parsea formatos como `13.70225, -89.21160` a coordenadas navegables. */
export function coordinatesFromString(input: string): Coordinates | null {
  const parsed = parseCoordinates(input.trim());
  if (!parsed) return null;
  return { latitude: parsed.latitude, longitude: parsed.longitude };
}

export function getWazeUrl(coordinates: Coordinates): string {
  const { latitude, longitude } = coordinates;
  return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}

export function getWazeUrlFromString(input: string): string | null {
  const coords = coordinatesFromString(input);
  if (!coords) return null;
  return getWazeUrl(coords);
}

export function getGoogleMapsUrl(coordinates: Coordinates): string {
  const { latitude, longitude } = coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

export function getGoogleMapsNativeUrl(coordinates: Coordinates): string {
  const { latitude, longitude } = coordinates;
  if (Platform.OS === 'ios') {
    return `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`;
  }
  return `google.navigation:q=${latitude},${longitude}`;
}

async function openWithFallback(primary: string, fallback: string): Promise<void> {
  const canPrimary = await Linking.canOpenURL(primary);
  if (canPrimary) {
    await Linking.openURL(primary);
    return;
  }
  const canFallback = await Linking.canOpenURL(fallback);
  if (canFallback) {
    await Linking.openURL(fallback);
    return;
  }
  await Linking.openURL(fallback);
}

export async function openWazeNavigationFromString(input: string): Promise<boolean> {
  const coords = coordinatesFromString(input);
  if (!coords) return false;
  await openWazeNavigation(coords);
  return true;
}

export async function openWazeNavigation(coordinates: Coordinates): Promise<void> {
  const url = getWazeUrl(coordinates);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }

  if (Platform.OS === 'ios') {
    await Linking.openURL(
      `maps://?daddr=${coordinates.latitude},${coordinates.longitude}`
    );
  } else {
    await Linking.openURL(
      `geo:${coordinates.latitude},${coordinates.longitude}?q=${coordinates.latitude},${coordinates.longitude}`
    );
  }
}

export async function openGoogleMapsNavigation(coordinates: Coordinates): Promise<void> {
  const native = getGoogleMapsNativeUrl(coordinates);
  const web = getGoogleMapsUrl(coordinates);
  try {
    await openWithFallback(native, web);
  } catch {
    await Linking.openURL(web);
  }
}
