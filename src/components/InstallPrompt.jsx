import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Info } from "lucide-react";
import { installSuccessTemplate } from "../lib/notification-templates";
import { useInstallPrompt } from "../hooks/use-install-prompt";
import browserCompatibility from "../lib/browser-compatibility";

/**
 * InstallPrompt Component
 *
 * Handles PWA installation prompt with custom UI and cross-browser support.
 * Implements beforeinstallprompt event handling and provides fallback for
 * browsers that don't support the standard install prompt.
 *
 * Requirements addressed:
 * - 1.1: WHEN the user visits the app THEN the browser SHALL display an install prompt for supported devices
 * - 1.2: WHEN the user installs the app THEN it SHALL appear on their home screen with the proper icon and name
 */
const InstallPrompt = () => {
  const {
    isInstallable,
    isInstalled,
    browserInfo,
    promptInstall,
    trackInstallEvent,
  } = useInstallPrompt();

  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Get browser-specific install instructions
  const installInstructions = browserCompatibility.getInstallInstructions();

  useEffect(() => {
    // Show install prompt after a delay if installable and not dismissed
    if (isInstallable && !sessionStorage.getItem("install_prompt_dismissed")) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);

      return () => clearTimeout(timer);
    }

    // For Safari, show manual instructions after longer delay
    if (
      browserInfo.type === "safari" &&
      !isInstalled &&
      !sessionStorage.getItem("install_prompt_dismissed")
    ) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled, browserInfo.type]);

  // Show install success notification
  const showInstallSuccessNotification = async () => {
    try {
      if ("serviceWorker" in navigator && "Notification" in window) {
        const registration = await navigator.serviceWorker.ready;
        const template = installSuccessTemplate();

        if (Notification.permission === "granted") {
          registration.showNotification(template.title, template);
        }
      }
    } catch (error) {
      console.error("Failed to show install success notification:", error);
    }
  };

  // Handle install button click
  const handleInstallClick = async () => {
    if (!isInstallable && browserInfo.type !== "safari") {
      trackInstallEvent("manual_instructions_shown", {
        browser: browserInfo.type,
      });
      return;
    }

    setIsInstalling(true);

    try {
      const result = await promptInstall();

      if (result.outcome === "accepted") {
        console.log("User accepted the install prompt");
        await showInstallSuccessNotification();
        trackInstallEvent("install_success", {
          browser: browserInfo.type,
          method: "beforeinstallprompt",
        });
      } else if (result.outcome === "dismissed") {
        console.log("User dismissed the install prompt");
        trackInstallEvent("install_dismissed", {
          browser: browserInfo.type,
        });
      }

      setShowPrompt(false);
    } catch (error) {
      console.error("Error during installation:", error);
      trackInstallEvent("install_error", {
        browser: browserInfo.type,
        error: error.message,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setShowPrompt(false);
    trackInstallEvent("prompt_dismissed", { browser: browserInfo.type });

    // Don't show again for this session
    sessionStorage.setItem("install_prompt_dismissed", "true");
  };

  // Don't show if already installed or dismissed this session
  if (isInstalled || !showPrompt) {
    return null;
  }

  // Render different UI based on browser support
  const renderInstallContent = () => {
    if (showInstructions || !installInstructions.supported) {
      // Show detailed browser-specific instructions
      return (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Install QR Guardian
              </h3>
              <p className="text-sm text-gray-600">
                {installInstructions.browser} on {installInstructions.platform}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-700 mb-3">
            <div className="space-y-1">
              {installInstructions.instructions.map((instruction, index) => (
                <p key={index}>
                  {index + 1}. {instruction}
                </p>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {installInstructions.supported && !showInstructions && (
              <Button
                onClick={() => setShowInstructions(false)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Try Auto Install
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className={
                installInstructions.supported && !showInstructions
                  ? ""
                  : "flex-1"
              }
            >
              Got it
            </Button>
          </div>
        </>
      );
    }

    if (isInstallable || installInstructions.supported) {
      // Standard install prompt for supported browsers
      return (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Install QR Guardian
              </h3>
              <p className="text-sm text-gray-600">
                Get quick access from your home screen
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1"
              size="sm"
            >
              {isInstalling ? "Installing..." : "Install App"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstructions(true)}
              className="px-2"
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </>
      );
    }

    // Fallback for unsupported browsers
    return (
      <>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gray-100 rounded-full">
            <Smartphone className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">QR Guardian</h3>
            <p className="text-sm text-gray-600">
              Bookmark this page for quick access
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDismiss}
          className="w-full"
        >
          Got it
        </Button>
      </>
    );
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-blue-200 bg-white/95 backdrop-blur-sm md:left-auto md:right-4 md:w-80">
      <CardContent className="p-4">{renderInstallContent()}</CardContent>
    </Card>
  );
};

export default InstallPrompt;
