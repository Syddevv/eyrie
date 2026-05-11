import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { radius } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  selectionColor: string;
  labelColor: string;
  textColor: string;
  placeholderColor: string;
  iconColor: string;
  surfaceColor: string;
  borderColor: string;
  error?: string | null;
  editable?: boolean;
};

export function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder,
  isVisible,
  onToggleVisibility,
  selectionColor,
  labelColor,
  textColor,
  placeholderColor,
  iconColor,
  surfaceColor,
  borderColor,
  error,
  editable = true,
}: PasswordInputProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.fieldLabel, { color: labelColor }]}>{label}</Text>
      <View
        style={[
          styles.fieldSurface,
          {
            backgroundColor: surfaceColor,
            borderColor: error ? "#EF4444" : borderColor,
            opacity: editable ? 1 : 0.72,
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          secureTextEntry={!isVisible}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          selectionColor={selectionColor}
          style={[styles.fieldInput, { color: textColor }]}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={onToggleVisibility}
          disabled={!editable}
        >
          <Feather name={isVisible ? "eye-off" : "eye"} size={18} color={iconColor} />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldBlock: {
    marginTop: 18,
  },
  fieldLabel: {
    marginBottom: 10,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeights.regular,
  },
  fieldSurface: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    marginTop: 7,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.medium,
    color: "#EF4444",
  },
});

