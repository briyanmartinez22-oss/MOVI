import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FormInput } from '../FormUI';
import { PrimaryButton } from '../PrimaryButton';
import { HELP_SUPPORT_CHANNELS } from '../../data/helpCenterContent';
import { submitSupportTicket } from '../../services/helpSupportService';
import { trackHelpContactSupport } from '../../services/helpAnalytics';
import { showSuccess } from '../../utils/feedback';
import { colors, typography, spacing, radius } from '../../theme';

export function HelpSupportPanel() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const openChannel = async (channel: (typeof HELP_SUPPORT_CHANNELS)[number]) => {
    void trackHelpContactSupport({ channel: channel.id, subject: channel.label });

    if (channel.id === 'whatsapp') {
      const digits = channel.value.replace(/\D/g, '');
      await Linking.openURL(`https://wa.me/${digits}`);
      return;
    }
    if (channel.id === 'email') {
      await Linking.openURL(`mailto:${channel.value}?subject=Soporte%20MOVI`);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      await submitSupportTicket({ subject: subject.trim(), message: message.trim() });
      void trackHelpContactSupport({ channel: 'form', subject: subject.trim() });
      showSuccess('Consulta enviada', 'Registramos tu mensaje. Te contactaremos pronto.');
      setSubject('');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {HELP_SUPPORT_CHANNELS.map((channel) => (
        <TouchableOpacity
          key={channel.id}
          style={styles.channelCard}
          onPress={() => openChannel(channel)}
          disabled={channel.id === 'form'}
        >
          <Ionicons
            name={
              channel.id === 'whatsapp'
                ? 'logo-whatsapp'
                : channel.id === 'email'
                  ? 'mail-outline'
                  : 'document-text-outline'
            }
            size={22}
            color={colors.brandRed}
          />
          <View style={styles.channelBody}>
            <Text style={styles.channelLabel}>{channel.label}</Text>
            <Text style={styles.channelValue}>{channel.value}</Text>
            <Text style={styles.channelDesc}>{channel.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={styles.form}>
        <Text style={styles.formTitle}>Formulario interno</Text>
        <FormInput label="Asunto" value={subject} onChangeText={setSubject} placeholder="Ej. Problema con OTP" />
        <FormInput
          label="Mensaje"
          value={message}
          onChangeText={setMessage}
          placeholder="Describe tu consulta"
          multiline
        />
        <PrimaryButton title="Enviar consulta" onPress={handleSubmit} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.md },
  channelCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  channelBody: { flex: 1 },
  channelLabel: { ...typography.bodyMedium, color: colors.text },
  channelValue: { ...typography.caption, color: colors.brandRed, marginTop: 2 },
  channelDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  form: { gap: spacing.sm },
  formTitle: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.sm },
});
