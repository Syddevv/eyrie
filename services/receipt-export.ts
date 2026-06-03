import { requireOptionalNativeModule } from "expo-modules-core";
import type { View } from "react-native";

export type ReceiptImageFormat = "png" | "jpg";

export type ReceiptExportResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "unavailable" | "permission" | "capture" | "save";
      message: string;
    };

function unavailable(message = "Receipt download is temporarily unavailable.") {
  return {
    ok: false as const,
    code: "unavailable" as const,
    message,
  };
}

function permission(message: string) {
  return {
    ok: false as const,
    code: "permission" as const,
    message,
  };
}

function capture(message: string) {
  return {
    ok: false as const,
    code: "capture" as const,
    message,
  };
}

function save(message: string) {
  return {
    ok: false as const,
    code: "save" as const,
    message,
  };
}

export function canExportReceiptImage() {
  try {
    return Boolean(
      requireOptionalNativeModule("ExpoMediaLibrary") ??
      requireOptionalNativeModule("ExpoMediaLibraryNext"),
    );
  } catch {
    return false;
  }
}

function loadViewShotModule() {
  try {
    const module = require("react-native-view-shot") as {
      captureRef?: (
        ref: View,
        options: {
          format: ReceiptImageFormat;
          quality: number;
          result: "tmpfile";
        },
      ) => Promise<string>;
    };

    return typeof module.captureRef === "function" ? module : null;
  } catch {
    return null;
  }
}

function loadMediaLibraryModule() {
  try {
    return require("expo-media-library") as typeof import("expo-media-library");
  } catch {
    return null;
  }
}

export async function exportReceiptImage(
  ref: View | null,
  format: ReceiptImageFormat = "png",
): Promise<ReceiptExportResult> {
  if (!ref) {
    return capture("Receipt preview is not ready yet. Please try again.");
  }

  const viewShotModule = loadViewShotModule();
  const mediaLibraryModule = loadMediaLibraryModule();

  if (!viewShotModule?.captureRef || !mediaLibraryModule) {
    return unavailable(
      "Receipt download is temporarily unavailable on this build.",
    );
  }

  try {
    const permissionResponse =
      await mediaLibraryModule.requestPermissionsAsync();

    if (!permissionResponse.granted) {
      return permission(
        "Photo library permission is required to save receipts.",
      );
    }
  } catch (error) {
    return unavailable(
      error instanceof Error
        ? error.message
        : "Receipt download is temporarily unavailable on this build.",
    );
  }

  let uri: string;

  try {
    uri = await viewShotModule.captureRef(ref, {
      format,
      quality: 1,
      result: "tmpfile",
    });
  } catch (error) {
    return capture(
      error instanceof Error
        ? error.message
        : "Unable to capture the receipt image.",
    );
  }

  try {
    await mediaLibraryModule.saveToLibraryAsync(uri);
    return { ok: true };
  } catch (error) {
    return save(
      error instanceof Error ? error.message : "Unable to save receipt image.",
    );
  }
}
