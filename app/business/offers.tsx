import { Redirect } from 'expo-router';

/** Reutiliza flujo de ofertas del pasajero (misma lógica de matching). */
export default function BusinessOffersScreen() {
  return <Redirect href="/passenger/offers" />;
}
