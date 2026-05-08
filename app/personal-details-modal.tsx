import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { themeColors } from '@/constants/colors';
import { radius, shadows } from '@/constants/theme';
import { fontFamilies, fontWeights } from '@/constants/typography';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PersonalDetailsModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [firstName, setFirstName] = useState('Juan');
  const [lastName, setLastName] = useState('dela Cruz');
  const [email, setEmail] = useState('juan.delacruz@email.com');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const initials = [firstName.trim().charAt(0), lastName.trim().charAt(0)].join('').trim().toUpperCase() || 'JD';

  const ui = useMemo(
    () => ({
      overlay: {
        backgroundColor: isDark ? 'rgba(2, 6, 23, 0.56)' : 'rgba(15, 23, 42, 0.32)',
      },
      sheet: {
        backgroundColor: isDark ? '#111A27' : '#F4F8FC',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.05)',
      },
      handle: {
        backgroundColor: isDark ? '#526173' : '#C9D3DF',
      },
      title: { color: isDark ? '#F8FAFC' : '#1A202C' },
      closeButton: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      },
      closeIcon: { color: isDark ? '#D4DCE6' : '#202733' },
      fieldLabel: { color: isDark ? '#E5EDF7' : '#293241' },
      fieldSurface: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E9EEF5',
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(223, 230, 238, 0.96)',
      },
      fieldValue: { color: isDark ? '#F8FAFC' : '#202733' },
      placeholder: { color: isDark ? '#8F9CAF' : '#7A8596' },
      primaryButton: { backgroundColor: colors.primary },
      primaryButtonText: { color: '#FFFFFF' },
      cameraButton: {
        backgroundColor: isDark ? '#E5EDF7' : '#FFFFFF',
        borderColor: isDark ? '#233042' : '#DCE4EE',
      },
      cameraIcon: { color: '#202733' },
    }),
    [colors.primary, isDark]
  );

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      defaultTab: 'albums',
      legacy: true,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      style={styles.keyboardWrap}>
      <View style={[styles.overlay, ui.overlay]}>
        <Pressable style={styles.backdrop} onPress={() => router.back()} />

        <View
          style={[
            styles.sheet,
            ui.sheet,
            shadows.floating,
            keyboardHeight > 0 && { marginBottom: Math.max(12, keyboardHeight - 8) },
          ]}>
          <View style={[styles.handle, ui.handle]} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, ui.title]}>Personal Information</Text>
            <Pressable style={[styles.closeButton, ui.closeButton]} onPress={() => router.back()}>
              <Feather name="x" size={20} color={ui.closeIcon.color} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} contentFit="cover" style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>

              <Pressable style={[styles.cameraButton, ui.cameraButton]} onPress={handlePickImage}>
                <Feather name="camera" size={16} color={ui.cameraIcon.color} />
              </Pressable>
            </View>

            <View style={styles.row}>
              <View style={styles.fieldHalf}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>First Name</Text>
                <View style={[styles.fieldSurface, ui.fieldSurface]}>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    placeholder="First name"
                    placeholderTextColor={ui.placeholder.color}
                    selectionColor={colors.primary}
                    style={[styles.fieldInput, ui.fieldValue]}
                  />
                </View>
              </View>

              <View style={styles.fieldHalf}>
                <Text style={[styles.fieldLabel, ui.fieldLabel]}>Last Name</Text>
                <View style={[styles.fieldSurface, ui.fieldSurface]}>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    placeholder="Last name"
                    placeholderTextColor={ui.placeholder.color}
                    selectionColor={colors.primary}
                    style={[styles.fieldInput, ui.fieldValue]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={[styles.fieldLabel, ui.fieldLabel]}>Email Address</Text>
              <View style={[styles.fieldSurface, ui.fieldSurface]}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor={ui.placeholder.color}
                  selectionColor={colors.primary}
                  style={[styles.fieldInput, ui.fieldValue]}
                />
              </View>
            </View>

            <Pressable style={[styles.saveButton, ui.primaryButton]} onPress={() => router.back()}>
              <Text style={[styles.saveButtonText, ui.primaryButtonText]}>Save Changes</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: {
    alignSelf: 'center',
    width: 49,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fontFamilies.sans,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: fontWeights.bold,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 18,
  },
  avatarWrap: {
    alignSelf: 'center',
    width: 114,
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  avatarCircle: {
    width: 98,
    height: 98,
    borderRadius: radius.full,
    backgroundColor: '#3C99EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontFamily: fontFamilies.sans,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    right: 10,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldBlock: {
    marginTop: 18,
  },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
  fieldSurface: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  fieldInput: {
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  saveButton: {
    marginTop: 28,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontFamily: fontFamilies.sans,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.bold,
  },
});
