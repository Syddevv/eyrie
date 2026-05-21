import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { MOTION_DURATION } from "@/constants/motion";
import { radius } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import type { AssistantChatMessage } from "@/services/assistant";

import { AssistantTypingIndicator } from "./AssistantTypingIndicator";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AssistantMessageBubble({
  message,
  titleColor,
  subtleColor,
  assistantCardColor,
  assistantBorderColor,
  userCardColor,
  userBorderColor,
}: {
  message: AssistantChatMessage;
  titleColor: string;
  subtleColor: string;
  assistantCardColor: string;
  assistantBorderColor: string;
  userCardColor: string;
  userBorderColor: string;
}) {
  const isAssistant = message.role === "assistant";

  return (
    <Animated.View
      entering={FadeInDown.duration(MOTION_DURATION.BASE)}
      style={[styles.row, isAssistant ? styles.rowAssistant : styles.rowUser]}
    >
      {isAssistant ? (
        <View style={styles.avatarFrame}>
          <Image
            contentFit="cover"
            source={require("@/assets/images/Eyrie_Mascot_3.png")}
            style={styles.avatar}
          />
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          isAssistant ? styles.assistantBubble : styles.userBubble,
          {
            backgroundColor: isAssistant ? assistantCardColor : userCardColor,
            borderColor: isAssistant ? assistantBorderColor : userBorderColor,
          },
        ]}
      >
        {message.status === "loading" ? (
          <AssistantTypingIndicator color={subtleColor} />
        ) : (
          <Text style={[styles.messageText, { color: titleColor }]}>
            {message.text}
          </Text>
        )}

        <Text style={[styles.time, { color: subtleColor }]}>
          {message.status === "loading"
            ? "Thinking..."
            : formatTime(message.createdAt)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    alignItems: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  avatarFrame: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: "#D8F7EC",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  bubble: {
    maxWidth: "82%",
    minHeight: 62,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  assistantBubble: {
    borderBottomLeftRadius: 10,
  },
  userBubble: {
    borderBottomRightRadius: 10,
  },
  messageText: {
    fontFamily: fontFamilies.sans,
    fontSize: 14.5,
    lineHeight: 22,
    fontWeight: fontWeights.medium,
  },
  time: {
    marginTop: 8,
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
});
