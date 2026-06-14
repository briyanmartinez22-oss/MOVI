import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HelpButton } from '../../src/components/HelpButton';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { useSafeBack } from '../../src/hooks/useSafeBack';
import { SafeBackFallback } from '../../src/components/SafeBackFallback';
import { salvadorPlaces } from '../../src/data/mock';
import { useTrip } from '../../src/context/TripContext';
import { Place } from '../../src/types';
import { placeFromCoordinates } from '../../src/types/models';
import { parseCoordinates, formatCoordinates } from '../../src/utils/parseCoordinates';
import { geocodeQuery } from '../../src/services/geocodingService';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing, radius } from '../../src/theme';

type SelectionStep = 'origin' | 'destination';

export default function DestinationScreen() {
  const router = useRouter();
  const { handleBack, showFallback, goHome } = useSafeBack();
  const { origin, destination, setOrigin, setDestination } = useTrip();
  const [step, setStep] = useState<SelectionStep>('origin');
  const [query, setQuery] = useState('');
  const [coordHint, setCoordHint] = useState('');
  const [geocoded, setGeocoded] = useState<Place[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setGeocoded([]);
      return;
    }
    const timer = setTimeout(() => {
      geocodeQuery(query).then((results) => {
        setGeocoded(
          results.map((r, i) => ({
            id: `geo-${i}-${r.coordinates.latitude}`,
            name: r.name,
            coordinates: r.coordinates,
          }))
        );
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    const places = salvadorPlaces.filter((place) =>
      place.name.toLowerCase().includes(query.toLowerCase())
    );
    const combined = [...geocoded, ...places.filter((p) => !geocoded.find((g) => g.name === p.name))];
    return step === 'destination'
      ? combined.filter((place) => place.id !== origin.id)
      : combined;
  }, [query, step, origin.id, geocoded]);

  const handleSelect = (place: Place) => {
    Keyboard.dismiss();
    if (step === 'origin') {
      setOrigin(place);
      setStep('destination');
      setQuery('');
      setCoordHint('');
      return;
    }

    setDestination(place);
    router.push('/passenger/estimate');
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    const parsed = parseCoordinates(text);
    if (parsed) {
      setCoordHint(
        `Coordenadas detectadas: ${formatCoordinates(parsed.latitude, parsed.longitude)}`
      );
    } else {
      setCoordHint('');
    }
  };

  const handleUseCoordinates = () => {
    const parsed = parseCoordinates(query);
    if (!parsed) return;
    Keyboard.dismiss();
    const place = placeFromCoordinates(
      { latitude: parsed.latitude, longitude: parsed.longitude },
      step === 'origin' ? 'Origen compartido' : 'Destino compartido'
    );
    handleSelect(place);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScreen style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === 'origin' ? 'Seleccionar origen' : 'Seleccionar destino'}
          </Text>
          <HelpButton compact />
        </View>
        {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}

        <Text style={styles.fieldHint}>
          {step === 'origin' ? FIELD_HINTS.origin : FIELD_HINTS.destination}
        </Text>

        <View style={styles.searchBox}>
          <View style={styles.dotOrigin} />
          <View style={styles.inputArea}>
            <Text style={styles.inputLabel}>Origen</Text>
            <Text style={styles.inputValue}>{origin.name}</Text>
          </View>
          {step === 'destination' && (
            <TouchableOpacity onPress={() => setStep('origin')}>
              <Text style={styles.changeLink}>Cambiar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.searchBox}>
          <View style={styles.dotDest} />
          <View style={styles.inputArea}>
            <Text style={styles.inputLabel}>Destino</Text>
            {step === 'destination' ? (
              <TextInput
                style={styles.textInput}
                placeholder="¿A dónde vas? (dirección o coordenadas)"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
              />
            ) : (
              <Text style={styles.placeholderText}>
                {destination?.name ?? 'Selecciona origen primero'}
              </Text>
            )}
          </View>
        </View>

        {coordHint ? (
          <View style={styles.coordBox}>
            <Text style={styles.coordHint}>{coordHint}</Text>
            <TouchableOpacity style={styles.coordBtn} onPress={handleUseCoordinates}>
              <Text style={styles.coordBtnText}>Usar en mapa</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => handleSelect(item)}>
              <View style={styles.listIcon}>
                <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.listText}>{item.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dotDest: {
    width: 10,
    height: 10,
    backgroundColor: colors.primary,
  },
  inputArea: {
    flex: 1,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inputValue: {
    ...typography.bodyMedium,
    color: colors.text,
    marginTop: 2,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  textInput: {
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  changeLink: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.lg + 10 + spacing.md,
    marginRight: spacing.lg,
  },
  list: {
    paddingTop: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  coordBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  coordHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  coordBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  coordBtnText: {
    ...typography.caption,
    color: colors.primaryText,
    fontWeight: '600',
  },
});
