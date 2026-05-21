import { Feather, Ionicons, Octicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { useEffect, useRef } from "react";

import { useBottomNavStore } from "@/store/useBottomNavStore";

import { themeColors } from "@/constants/colors";
import { MOTION_DURATION, RN_MOTION_EASING } from "@/constants/motion";
import { radius, shadows } from "@/constants/theme";
import { fontFamilies } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { triggerNavigationHaptic } from "@/src/lib/navigationHaptics";

type NavVariant = "light" | "dark";
type ActiveTab = "home" | "budget" | "goals" | "assistant" | "none";

interface AppBottomNavProps {
  activeTab: ActiveTab;
  variant?: NavVariant;
}

const TAB_ROUTE_TO_ACTIVE: Record<string, Exclude<ActiveTab, "none">> = {
  index: "home",
  explore: "budget",
  goals: "goals",
  assistant: "assistant",
};

function withOpacity(hex: string, opacity: number) {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const red = parseInt(full.slice(0, 2), 16);
  const green = parseInt(full.slice(2, 4), 16);
  const blue = parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function NavBody({
  activeTab,
  variant,
  onNavigate,
  onOpenAddTransaction,
}: {
  activeTab: ActiveTab;
  variant: NavVariant;
  onNavigate: (tab: Exclude<ActiveTab, "none">) => void;
  onOpenAddTransaction: () => void;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = themeColors[colorScheme];

  const isDark = variant === "dark";
  const backgroundColor = isDark ? "#111722" : colors.card;
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.06)"
    : withOpacity(colors.border, 0.86);
  const mutedColor = isDark ? "#7E8796" : colors.mutedForeground;
  const activeColor = "#1495FF";

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View
        style={[
          styles.navBar,
          { backgroundColor, borderColor },
          shadows.floating,
        ]}
      >
        <Pressable style={styles.navItem} onPress={() => onNavigate("home")}>
          <Ionicons
            name="home"
            size={22}
            color={activeTab === "home" ? activeColor : mutedColor}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "home" ? activeColor : mutedColor },
            ]}
          >
            Home
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => onNavigate("budget")}>
          <Ionicons
            name="wallet-outline"
            size={22}
            color={activeTab === "budget" ? activeColor : mutedColor}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "budget" ? activeColor : mutedColor },
            ]}
          >
            Budget
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.plusButton,
            { backgroundColor: activeColor },
            shadows.glow,
          ]}
          onPress={onOpenAddTransaction}
        >
          <Feather name="plus" size={28} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => onNavigate("goals")}>
          <Octicons
            name="goal"
            size={20}
            color={activeTab === "goals" ? activeColor : mutedColor}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "goals" ? activeColor : mutedColor },
            ]}
          >
            Goals
          </Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => onNavigate("assistant")}
        >
          <Image
            contentFit="cover"
            source={require("@/assets/images/Eyrie_Mascot_3.png")}
            style={styles.assistantIcon}
          />
          <Text
            style={[
              styles.navLabel,
              { color: activeTab === "assistant" ? activeColor : mutedColor },
            ]}
          >
            Assistant
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme() ?? "light";
  const router = useRouter();
  const pathname = usePathname();

  const activeRoute = state.routes[state.index]?.name ?? "index";
  const activeTab = TAB_ROUTE_TO_ACTIVE[activeRoute] ?? "home";
  const variant = colorScheme === "dark" ? "dark" : "light";

  const handleNavigate = (tab: Exclude<ActiveTab, "none">) => {
    const routeName =
      tab === "home"
        ? "index"
        : tab === "budget"
          ? "explore"
          : tab === "goals"
            ? "goals"
            : "assistant";

    const targetRoute = state.routes.find((route) => route.name === routeName);
    if (!targetRoute) {
      return;
    }

    if (targetRoute.key === state.routes[state.index]?.key) {
      return;
    }

    void triggerNavigationHaptic();
    navigation.navigate(targetRoute.name, targetRoute.params);
  };

  const handleAdd = () => {
    if (pathname !== "/modal") {
      void triggerNavigationHaptic();
      router.push("/modal");
    }
  };

  return (
    <AnimatedView
      activeTab={activeTab}
      variant={variant}
      onNavigate={handleNavigate}
      onOpenAddTransaction={handleAdd}
    />
  );
}

export function AppBottomNav({
  activeTab,
  variant = "light",
}: AppBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigate = (tab: Exclude<ActiveTab, "none">) => {
    const href =
      tab === "home"
        ? "/"
        : tab === "budget"
          ? "/explore"
          : tab === "goals"
            ? "/goals"
            : "/assistant";

    if (pathname !== href) {
      void triggerNavigationHaptic();
      router.replace(href);
    }
  };

  return (
    <AnimatedView
      activeTab={activeTab}
      variant={variant}
      onNavigate={navigate}
      onOpenAddTransaction={() => {
        if (pathname !== "/modal") {
          void triggerNavigationHaptic();
          router.push("/modal");
        }
      }}
    />
  );
}

function AnimatedView({
  activeTab,
  variant,
  onNavigate,
  onOpenAddTransaction,
}: any) {
  const visible = useBottomNavStore((s) => s.visible);
  const anim = useRef(new Animated.Value(visible ? 0 : 1)).current;

  useEffect(() => {
    const toValue = visible ? 0 : 1;
    Animated.timing(anim, {
      toValue,
      duration: MOTION_DURATION.BASE,
      easing: RN_MOTION_EASING.OUT_CUBIC,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={{
        transform: [{ translateY }],
        opacity,
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 12,
      }}
    >
      <NavBody
        activeTab={activeTab}
        variant={variant}
        onNavigate={onNavigate}
        onOpenAddTransaction={onOpenAddTransaction}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 12,
  },
  navBar: {
    height: 80,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    gap: 4,
  },
  navLabel: {
    fontFamily: fontFamilies.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  plusButton: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
  assistantIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
  },
});
