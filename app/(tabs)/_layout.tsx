import { Tabs } from "expo-router";
import React from "react";

import { FloatingTabBar } from "@/components/app-bottom-nav";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        freezeOnBlur: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Budget",
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Assistant",
        }}
      />
    </Tabs>
  );
}
