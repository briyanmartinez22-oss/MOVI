import { useEffect, useState } from 'react';
import { View, Image, StyleSheet, type ImageStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { resolveProfilePhotoUrl } from '../utils/profilePhoto';

type OwnerProfileAvatarProps = {
  photoUrl?: string | null;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  debugContext?: string;
};

export function OwnerProfileAvatar({
  photoUrl,
  size = 72,
  style,
  imageStyle,
  debugContext = 'owner-account-header',
}: OwnerProfileAvatarProps) {
  const resolvedUrl = resolveProfilePhotoUrl(photoUrl);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [resolvedUrl]);

  useEffect(() => {
    console.log('[OWNER_AVATAR_FIX_DEBUG]', {
      context: debugContext,
      avatarField: 'AuthUser.profilePhoto',
      rawPhotoUrl: photoUrl ?? null,
      resolvedPhotoUrl: resolvedUrl ?? null,
      loadFailed,
    });
  }, [debugContext, photoUrl, resolvedUrl, loadFailed]);

  const radius = size / 2;

  if (!resolvedUrl || loadFailed) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: radius },
          style,
        ]}
      >
        <Ionicons name="person" size={Math.round(size * 0.44)} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <Image
        key={resolvedUrl}
        source={{ uri: resolvedUrl, cache: 'reload' }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
          imageStyle,
        ]}
        resizeMode="cover"
        onError={() => {
          console.log('[OWNER_AVATAR_FIX_DEBUG]', {
            context: debugContext,
            avatarLoadFailed: true,
            resolvedPhotoUrl: resolvedUrl,
          });
          setLoadFailed(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.borderLight,
  },
  image: {
    backgroundColor: colors.borderLight,
  },
  placeholder: {
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
