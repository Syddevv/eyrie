import { Feather, Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOut,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { themeColors } from "@/constants/colors";
import { MOTION_DURATION, createStaggerDelay } from "@/constants/motion";
import { radius } from "@/constants/theme";
import { fontFamilies, fontWeights } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAssistantSession } from "@/hooks/useAssistantSession";
import type { AssistantChatMessage } from "@/services/assistant";

import { AssistantMessageBubble } from "./AssistantMessageBubble";
import { AssistantSuggestionChip } from "./AssistantSuggestionChip";

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

type QuickPrompt = {
  icon: "trending-up" | "shield" | "dollar-sign" | "pie-chart" | "target";
  text: string;
};

const BOTTOM_NAV_RESERVED_HEIGHT = 64;
const AI_ASSISTANT_RESET_TIME_LABEL = "8:00 AM";

export function AssistantChatPanel({
  quickPrompts,
}: {
  quickPrompts: readonly QuickPrompt[];
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<AssistantChatMessage> | null>(null);
  const {
    messages,
    input,
    setInput,
    sendMessage,
    sendSuggestion,
    isSending,
    isOffline,
    remainingMessages,
    dailyLimit,
    cooldownRemaining,
    assistantStatusMessage,
  } = useAssistantSession();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  const pageStyles = useMemo(
    () => ({
      background: { backgroundColor: isDark ? "#060B15" : colors.background },
      card: {
        backgroundColor: isDark ? "#101722" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : withOpacity(colors.border, 0.92),
      },
      assistantBubble: {
        backgroundColor: isDark ? "#0F1724" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.08)"
          : withOpacity(colors.border, 0.95),
      },
      userBubble: {
        backgroundColor: isDark ? "#071B35" : "#EAF5FF",
        borderColor: isDark ? "rgba(20,149,255,0.22)" : "rgba(20,149,255,0.18)",
      },
      chip: {
        backgroundColor: isDark
          ? "#161D29"
          : withOpacity(colors.secondary, 0.92),
        borderColor: isDark
          ? "rgba(255,255,255,0.03)"
          : withOpacity(colors.border, 0.6),
      },
      input: {
        backgroundColor: isDark ? "#161D29" : colors.card,
        borderColor: isDark
          ? "rgba(255,255,255,0.05)"
          : withOpacity(colors.border, 0.92),
      },
      sendButton: {
        backgroundColor: colors.primary,
      },
      sendButtonDisabled: {
        backgroundColor: isDark
          ? colors.secondary
          : withOpacity(colors.secondary, 0.92),
      },
      sendButtonIcon: {
        color: isDark ? "#081120" : "#FFFFFF",
      },
      sendButtonIconDisabled: {
        color: isDark
          ? colors.secondaryForeground
          : withOpacity(colors.mutedForeground, 0.9),
      },
      title: { color: isDark ? "#FFFFFF" : colors.foreground },
      subtitle: { color: isDark ? "#9EA6B5" : "#6A7384" },
      helper: { color: isDark ? "#8F9AAF" : colors.mutedForeground },
      offlineCard: {
        backgroundColor: isDark
          ? "rgba(239,68,68,0.08)"
          : "rgba(239,68,68,0.06)",
        borderColor: isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.12)",
      },
      suggestionsCard: {
        backgroundColor: isDark
          ? "rgba(18,26,39,0.9)"
          : "rgba(255,255,255,0.9)",
        borderColor: isDark
          ? "rgba(148,163,184,0.14)"
          : withOpacity(colors.border, 0.78),
        shadowColor: isDark ? "#020617" : "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.2 : 0,
        shadowRadius: 18,
        elevation: isDark ? 3 : 0,
      },
      composerCard: {
        backgroundColor: isDark
          ? "rgba(16,23,34,0.96)"
          : "rgba(255,255,255,0.98)",
        borderColor: isDark
          ? "rgba(255,255,255,0.06)"
          : withOpacity(colors.border, 0.92),
      },
    }),
    [colors, isDark],
  );

  const composerBottomInset = Math.max(
    20,
    insets.bottom + BOTTOM_NAV_RESERVED_HEIGHT,
  );
  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages],
  );
  const footerBottomOffset =
    keyboardHeight > 0 ? keyboardHeight : composerBottomInset;
  const listFooterHeight =
    Math.max(footerBottomOffset, composerBottomInset) +
    footerHeight +
    (hasUserMessages ? 28 : 20);
  const showUsageSummary =
    typeof remainingMessages === "number" && typeof dailyLimit === "number";
  const usageSummaryText = showUsageSummary
    ? `${remainingMessages} / ${dailyLimit} AI messages remaining today`
    : "AI usage is limited each day.";
  const cooldownText =
    cooldownRemaining > 0
      ? `Please wait ${cooldownRemaining} second${cooldownRemaining === 1 ? "" : "s"} before sending another message.`
      : remainingMessages === 0
        ? assistantStatusMessage ||
          `You've reached today's AI assistant limit. Limit will reset on ${AI_ASSISTANT_RESET_TIME_LABEL}.`
        : null;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollToBottom();
    }
  }, [keyboardHeight, scrollToBottom]);

  useEffect(() => {
    if (footerHeight > 0) {
      scrollToBottom();
    }
  }, [footerBottomOffset, footerHeight, scrollToBottom]);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      const nextHeight = Math.max(
        0,
        event.endCoordinates.height -
          (Platform.OS === "ios" ? insets.bottom : 0),
      );
      setKeyboardHeight(nextHeight);
    };

    const handleKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      handleKeyboardShow,
    );
    const hideSubscription = Keyboard.addListener(
      hideEvent,
      handleKeyboardHide,
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const handleSend = useCallback(() => {
    void sendMessage();
  }, [sendMessage]);

  const isSendDisabled =
    isOffline ||
    isSending ||
    !input.trim() ||
    cooldownRemaining > 0 ||
    remainingMessages === 0;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[styles.safeArea, pageStyles.background]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 84 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AssistantMessageBubble
              message={item}
              titleColor={pageStyles.title.color}
              subtleColor={pageStyles.subtitle.color}
              assistantCardColor={pageStyles.assistantBubble.backgroundColor}
              assistantBorderColor={pageStyles.assistantBubble.borderColor}
              userCardColor={pageStyles.userBubble.backgroundColor}
              userBorderColor={pageStyles.userBubble.borderColor}
            />
          )}
          style={styles.flex}
          contentContainerStyle={[
            styles.messagesContent,
            {
              paddingBottom: 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={<View style={{ height: listFooterHeight }} />}
          ListHeaderComponent={
            isOffline ? (
              <View style={[styles.offlineCard, pageStyles.offlineCard]}>
                <Feather name="wifi-off" size={16} color="#EF4444" />
                <Text style={[styles.offlineText, pageStyles.helper]}>
                  AI Assistant requires an internet connection.
                </Text>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.footerWrap,
            {
              bottom: footerBottomOffset,
              paddingBottom: 2,
            },
          ]}
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setFooterHeight((current) =>
              current === nextHeight ? current : nextHeight,
            );
          }}
        >
          {!hasUserMessages ? (
            <Animated.View
              entering={FadeIn.duration(MOTION_DURATION.FAST)}
              exiting={FadeOut.duration(MOTION_DURATION.TINY + 20)}
              style={styles.promptsWrap}
            >
              <FlatList
                horizontal
                data={quickPrompts as QuickPrompt[]}
                keyExtractor={(item) => item.text}
                renderItem={({ item, index }) => (
                  <Animated.View
                    entering={FadeInRight.duration(MOTION_DURATION.BASE).delay(
                      createStaggerDelay(index, 0, 55),
                    )}
                  >
                    <View
                      style={[
                        styles.suggestionItemCard,
                        pageStyles.suggestionsCard,
                      ]}
                    >
                      <AssistantSuggestionChip
                        disabled={isOffline || isSending}
                        label={item.text}
                        icon={item.icon}
                        onPress={() => void sendSuggestion(item.text)}
                        backgroundColor="transparent"
                        borderColor="transparent"
                        textColor={pageStyles.title.color}
                        iconColor="#1495FF"
                      />
                    </View>
                  </Animated.View>
                )}
                contentContainerStyle={styles.quickPromptRow}
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
              />
            </Animated.View>
          ) : null}

          <View style={styles.composerMeta}>
            <Text style={[styles.helperText, pageStyles.helper]}>
              {usageSummaryText}
            </Text>
            {cooldownText ? (
              <Text
                style={[
                  styles.helperText,
                  styles.cooldownText,
                  pageStyles.subtitle,
                ]}
              >
                {cooldownText}
              </Text>
            ) : null}
            <Text style={[styles.helperText, pageStyles.helper]}>
              AI Assistant requires an internet connection.
            </Text>
          </View>

          <View
            style={[
              styles.inputRow,
              styles.composerCard,
              pageStyles.composerCard,
              isOffline && styles.inputWrapDisabled,
            ]}
          >
            <View style={styles.inputWrap}>
              <TextInput
                editable={!isOffline && !isSending}
                value={input}
                onChangeText={setInput}
                style={[styles.input, pageStyles.title]}
                placeholder="Ask about your finances..."
                placeholderTextColor={pageStyles.subtitle.color}
                multiline
                maxLength={600}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (!isOffline && !isSending) {
                    void sendMessage();
                  }
                }}
              />
            </View>

            <Pressable
              disabled={isSendDisabled}
              style={({ pressed }) => [
                styles.sendButton,
                isSendDisabled
                  ? pageStyles.sendButtonDisabled
                  : pageStyles.sendButton,
                { opacity: pressed ? 0.82 : 1 },
              ]}
              onPress={handleSend}
            >
              {isSending ? (
                <ActivityIndicator
                  color={
                    isSendDisabled
                      ? pageStyles.sendButtonIconDisabled.color
                      : pageStyles.sendButtonIcon.color
                  }
                  size="small"
                />
              ) : (
                <Ionicons
                  name="paper-plane"
                  size={20}
                  color={
                    isSendDisabled
                      ? pageStyles.sendButtonIconDisabled.color
                      : pageStyles.sendButtonIcon.color
                  }
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  footerWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    paddingTop: 0,
    gap: 8,
  },
  promptsWrap: {
    minHeight: 0,
    marginHorizontal: -2,
  },
  suggestionItemCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginVertical: 2,
  },
  quickPromptRow: {
    gap: 10,
    paddingLeft: 6,
    paddingRight: 14,
  },
  composerMeta: {
    minHeight: 0,
    marginTop: 8,
    marginBottom: 2,
  },
  helperText: {
    fontFamily: fontFamilies.sans,
    fontSize: 12,
    lineHeight: 16,
  },
  cooldownText: {
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  composerCard: {
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 112,
    justifyContent: "center",
  },
  inputWrapDisabled: {
    opacity: 0.6,
  },
  input: {
    minHeight: 24,
    maxHeight: 92,
    fontFamily: fontFamilies.sans,
    fontSize: 14,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offlineText: {
    flex: 1,
    fontFamily: fontFamilies.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeights.medium,
  },
});
