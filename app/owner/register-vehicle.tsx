import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { showSuccess } from '../../src/utils/feedback';
import { ASSOCIATIONS } from '../../src/data/mock';
import { useAuth } from '../../src/context/AuthContext';
import {
  registerVehicle,
  uploadVehicleDocuments,
  submitVehicleVerification,
} from '../../src/services/api';
import { getOwnerByUserId } from '../../src/services/profileData';
import { pickAndUploadDocument } from '../../src/services/uploadService';
import { VehicleType } from '../../src/types/models';
import { isCargoVehicleType, VEHICLE_TYPE_META, VEHICLE_TYPE_OPTIONS } from '../../src/utils/vehicleTypes';
import { colors, typography, spacing } from '../../src/theme';

const VEHICLE_DOCS = [
  'registrationCardImage', 'permitImage', 'insuranceImage',
  'platePhoto', 'unitPhoto', 'fullVehiclePhoto',
] as const;

const DOC_LABELS: Record<string, string> = {
  registrationCardImage: 'Tarjeta de circulación',
  permitImage: 'Permiso',
  insuranceImage: 'Seguro',
  platePhoto: 'Foto de placa',
  unitPhoto: 'Foto lateral',
  fullVehiclePhoto: 'Foto completa (placa + unidad + vehículo)',
};

export default function RegisterVehicle() {
  const router = useRouter();
  const { user } = useAuth();
  const owner = user ? getOwnerByUserId(user.userId) : null;
  const [unitNumber, setUnitNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [associationName, setAssociationName] = useState<string>(ASSOCIATIONS[0]);
  const [registrationName, setRegistrationName] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('mototaxi');
  const [maxLoadKg, setMaxLoadKg] = useState('');
  const [bedLengthM, setBedLengthM] = useState('');
  const [hasCargoCover, setHasCargoCover] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleStatus, setVehicleStatus] = useState<string>('draft');
  const [step, setStep] = useState<'info' | 'docs'>('info');
  const [error, setError] = useState('');

  const showCargoFields = isCargoVehicleType(vehicleType);
  const vehicleLabel = VEHICLE_TYPE_META[vehicleType].label.toLowerCase();

  const handleRegister = async () => {
    if (!owner) { setError('Dueño no encontrado'); return; }
    const res = await registerVehicle(owner.id, {
      unitNumber,
      plateNumber,
      associationName,
      registrationName: registrationName.trim() || undefined,
      vehicleType,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      year: year ? Number(year) : undefined,
      color: color.trim() || undefined,
      maxLoadKg: showCargoFields && maxLoadKg ? Number(maxLoadKg) : undefined,
      bedLengthM: showCargoFields && bedLengthM ? Number(bedLengthM) : undefined,
      hasCargoCover: showCargoFields ? hasCargoCover : undefined,
    });
    if (!res.ok) { setError(res.error ?? 'Error'); return; }
    setVehicleId(res.data!.vehicleId);
    setVehicleStatus(res.data!.status);
    setStep('docs');
  };

  const uploadDoc = async (key: typeof VEHICLE_DOCS[number]) => {
    const url = await pickAndUploadDocument(key);
    if (!url) return;
    const res = await uploadVehicleDocuments(vehicleId, {
      [key]: url,
      ...(key === 'registrationCardImage' && registrationName
        ? { registrationName: registrationName.trim() }
        : {}),
    });
    if (res.ok) setVehicleStatus(res.data!.status);
  };

  const isApproved = vehicleStatus === 'approved';

  const submit = async () => {
    if (isApproved) {
      showSuccess('Vehículo aprobado', 'Tu unidad ya está aprobada. Puedes continuar.');
      router.replace('/owner/vehicles');
      return;
    }
    const res = await submitVehicleVerification(vehicleId);
    if (!res.ok) {
      setError(res.error ?? 'Error al enviar verificación');
      return;
    }
    setVehicleStatus(res.data!.status);
    if (res.data!.status === 'approved') {
      showSuccess('Vehículo aprobado', res.data!.message ?? 'Tu unidad ya está aprobada.');
    } else {
      showSuccess('Unidad enviada', `Tu ${vehicleLabel} está en revisión por el equipo MOVI.`);
    }
    router.replace('/owner/vehicles');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registrar unidad" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        {step === 'info' ? (
          <>
            <Text style={styles.label}>Tipo de vehículo</Text>
            <View style={styles.typeGrid}>
              {VEHICLE_TYPE_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, vehicleType === type && styles.typeChipActive]}
                  onPress={() => setVehicleType(type)}
                >
                  <Text style={styles.typeEmoji}>{VEHICLE_TYPE_META[type].emoji}</Text>
                  <Text style={[styles.typeText, vehicleType === type && styles.typeTextActive]}>
                    {VEHICLE_TYPE_META[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormInput label="Número de unidad" value={unitNumber} onChangeText={setUnitNumber} placeholder="015" />
            <FormInput label="Placa" value={plateNumber} onChangeText={setPlateNumber} placeholder="MTX-205" />
            <FormInput label="Marca" value={brand} onChangeText={setBrand} placeholder="Suzuki" />
            <FormInput label="Modelo" value={model} onChangeText={setModel} placeholder="GN125" />
            <FormInput label="Año" value={year} onChangeText={setYear} placeholder="2022" keyboardType="numeric" />
            <FormInput label="Color" value={color} onChangeText={setColor} placeholder="Rojo" />
            <FormInput
              label="Nombre en tarjeta de circulación"
              value={registrationName}
              onChangeText={setRegistrationName}
              placeholder="Debe coincidir con DUI del dueño"
            />
            <Text style={styles.label}>Asociación</Text>
            {ASSOCIATIONS.map((a) => (
              <TouchableOpacity key={a} style={[styles.chip, associationName === a && styles.chipActive]} onPress={() => setAssociationName(a)}>
                <Text style={styles.chipText}>{a}</Text>
              </TouchableOpacity>
            ))}

            {showCargoFields && (
              <>
                <Text style={styles.section}>Capacidad de carga</Text>
                <FormInput
                  label="Carga máxima (kg)"
                  value={maxLoadKg}
                  onChangeText={setMaxLoadKg}
                  placeholder="1500"
                  keyboardType="numeric"
                />
                <FormInput
                  label="Largo de caja (m)"
                  value={bedLengthM}
                  onChangeText={setBedLengthM}
                  placeholder="2.4"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.coverToggle, hasCargoCover && styles.coverToggleActive]}
                  onPress={() => setHasCargoCover((v) => !v)}
                >
                  <Text style={styles.coverText}>
                    {hasCargoCover ? '✓ ' : ''}Tiene lona / cobertura de carga
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Continuar" onPress={handleRegister} />
          </>
        ) : (
          <>
            <Text style={styles.section}>Documentos de la unidad</Text>
            {isApproved ? (
              <Text style={styles.approvedBanner}>Vehículo aprobado. Ya puedes continuar al siguiente paso.</Text>
            ) : null}
            {VEHICLE_DOCS.map((key) => (
              <TouchableOpacity key={key} style={styles.docBtn} onPress={() => uploadDoc(key)}>
                <Text style={styles.docLabel}>{DOC_LABELS[key]}</Text>
                <Text style={styles.docAction}>Subir (mock)</Text>
              </TouchableOpacity>
            ))}
            <PrimaryButton
              title={isApproved ? 'Continuar' : 'Enviar verificación'}
              onPress={submit}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  typeChip: {
    width: '47%',
    backgroundColor: colors.borderLight,
    padding: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  typeChipActive: { backgroundColor: colors.primary },
  typeEmoji: { fontSize: 20 },
  typeText: { ...typography.caption, color: colors.text, textAlign: 'center' },
  typeTextActive: { color: colors.primaryText, fontWeight: '600' },
  chip: { backgroundColor: colors.borderLight, padding: spacing.sm, borderRadius: 8, marginBottom: spacing.xs },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  approvedBanner: {
    ...typography.body,
    color: colors.online,
    marginBottom: spacing.md,
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
  },
  coverToggle: {
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  coverToggleActive: { backgroundColor: colors.primary },
  coverText: { ...typography.body, color: colors.text },
  docBtn: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.borderLight, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm },
  docLabel: { ...typography.body, color: colors.text, flex: 1 },
  docAction: { ...typography.caption, color: colors.textSecondary },
});
