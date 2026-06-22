import { Platform } from 'react-native';
import OperationsLiveWeb from '../../src/platforms/web/OperationsLiveWeb';
import OperationsLiveMobile from '../../src/platforms/mobile/OperationsLiveMobile';

export default function OperationsLiveScreen() {
  return Platform.OS === 'web' ? <OperationsLiveWeb /> : <OperationsLiveMobile />;
}
