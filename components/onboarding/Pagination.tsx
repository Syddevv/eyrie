import { Pressable, StyleSheet, View } from "react-native";
import { MotiView } from "moti";

import { MOTION_DURATION, MOTION_EASING } from "@/constants/motion";

type PaginationProps = {
  count: number;
  active: number;
  onDotClick?: (index: number) => void;
};

export default function Pagination({
  count,
  active,
  onDotClick,
}: PaginationProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === active;

        return (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${index + 1}`}
            onPress={() => onDotClick?.(index)}
            style={styles.button}
          >
            <MotiView
              animate={{
                width: isActive ? 26 : 9,
                opacity: isActive ? 1 : 0.85,
                backgroundColor: isActive ? "#1677FF" : "#C8D4E4",
              }}
              transition={{
                type: "timing",
                duration: MOTION_DURATION.BASE,
                easing: MOTION_EASING.OUT_CUBIC,
              }}
              style={styles.dot}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  dot: {
    height: 9,
    borderRadius: 999,
  },
});
