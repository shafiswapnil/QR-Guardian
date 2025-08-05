import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Smartphone,
  Download,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import browserCompatibility from "../lib/browser-compatibility";
import ResponsiveTestGrid from "./ResponsiveTestGrid";

/**
 * CrossBrowserTestPage Component
 *
 * Comprehensive testing interface for PWA functionality across browsers
 * Provides manual and automated testing tools for cross-browser compatibility
 */
const CrossBrowserTestPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showResponsiveTest, setShowResponsiveTest] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    Notification.permission
  );

  // Get browser compatibility info
  const compatibilityReport = browserCompatibility.getCompatibilityReport();

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor install prompt availability
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptAvailable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Apply browser-specific CSS fixes
    browserCompatibility.applyCSSFixes();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Test PWA installation
  const testInstallation = async () => {
    const testId = "installation";
    setTestResults((prev) => ({ ...prev, [testId]: { status: "running" } }));

    try {
      if (installPromptAvailable) {
        // Test automatic install prompt
        setTestResults((prev) => ({
          ...prev,
          [testId]: {
            status: "success",
            message: "Install prompt is available and working",
            details: browserCompatibility.getInstallInstructions(),
          },
        }));
      } else {
        // Check if already installed or not supported
        const isInstalled = window.matchMedia(
          "(display-mode: standalone)"
        ).matches;
        if (isInstalled) {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "info",
              message: "App is already installed",
            },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "warning",
              message:
                "Install prompt not available - may not be supported or criteria not met",
              details: browserCompatibility.getInstallInstructions(),
            },
          }));
        }
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          status: "error",
          message: `Installation test failed: ${error.message}`,
        },
      }));
    }
  };

  // Test offline functionality
  const testOfflineMode = async () => {
    const testId = "offline";
    setTestResults((prev) => ({ ...prev, [testId]: { status: "running" } }));

    try {
      // Test service worker registration
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "success",
              message: "Service worker is registered and active",
              details: {
                scope: registration.scope,
                state: registration.active?.state || "unknown",
              },
            },
          }));
        } else {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "error",
              message: "Service worker is not registered",
            },
          }));
        }
      } else {
        setTestResults((prev) => ({
          ...prev,
          [testId]: {
            status: "error",
            message: "Service workers not supported in this browser",
          },
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          status: "error",
          message: `Offline test failed: ${error.message}`,
        },
      }));
    }
  };

  // Test push notifications
  const testNotifications = async () => {
    const testId = "notifications";
    setTestResults((prev) => ({ ...prev, [testId]: { status: "running" } }));

    try {
      if ("Notification" in window) {
        if (notificationPermission === "granted") {
          // Test showing a notification
          const notification = new Notification("QR Guardian Test", {
            body: "Push notifications are working correctly!",
            icon: "/android-chrome-192x192.png",
            badge: "/android-chrome-192x192.png",
          });

          setTimeout(() => notification.close(), 3000);

          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "success",
              message: "Notifications are working correctly",
            },
          }));
        } else if (notificationPermission === "denied") {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "warning",
              message: "Notification permission denied by user",
            },
          }));
        } else {
          // Request permission
          const permission = await Notification.requestPermission();
          setNotificationPermission(permission);

          if (permission === "granted") {
            await testNotifications(); // Retry test
          } else {
            setTestResults((prev) => ({
              ...prev,
              [testId]: {
                status: "warning",
                message: "Notification permission not granted",
              },
            }));
          }
        }
      } else {
        setTestResults((prev) => ({
          ...prev,
          [testId]: {
            status: "error",
            message: "Notifications not supported in this browser",
          },
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          status: "error",
          message: `Notification test failed: ${error.message}`,
        },
      }));
    }
  };

  // Test data persistence
  const testDataPersistence = async () => {
    const testId = "persistence";
    setTestResults((prev) => ({ ...prev, [testId]: { status: "running" } }));

    try {
      // Test IndexedDB
      if ("indexedDB" in window) {
        const testData = { id: "test", timestamp: Date.now() };

        // Simple IndexedDB test
        const request = indexedDB.open("test-db", 1);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("test-store")) {
            db.createObjectStore("test-store", { keyPath: "id" });
          }
        };

        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(["test-store"], "readwrite");
          const store = transaction.objectStore("test-store");

          store.add(testData);

          transaction.oncomplete = () => {
            db.close();
            setTestResults((prev) => ({
              ...prev,
              [testId]: {
                status: "success",
                message: "IndexedDB is working correctly",
              },
            }));
          };

          transaction.onerror = () => {
            db.close();
            setTestResults((prev) => ({
              ...prev,
              [testId]: {
                status: "error",
                message: "IndexedDB transaction failed",
              },
            }));
          };
        };

        request.onerror = () => {
          setTestResults((prev) => ({
            ...prev,
            [testId]: {
              status: "error",
              message: "Failed to open IndexedDB",
            },
          }));
        };
      } else {
        setTestResults((prev) => ({
          ...prev,
          [testId]: {
            status: "error",
            message: "IndexedDB not supported in this browser",
          },
        }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [testId]: {
          status: "error",
          message: `Data persistence test failed: ${error.message}`,
        },
      }));
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults({});
    await Promise.all([
      testInstallation(),
      testOfflineMode(),
      testNotifications(),
      testDataPersistence(),
    ]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "info":
        return <Info className="w-4 h-4 text-blue-600" />;
      case "running":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      case "running":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200";
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Cross-Browser PWA Testing</h1>
        <p className="text-gray-600">
          Comprehensive testing suite for PWA functionality across different
          browsers and devices
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="responsive">Responsive</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Browser</span>
                </div>
                <p className="text-lg font-semibold capitalize">
                  {compatibilityReport.browser}
                </p>
                <p className="text-sm text-gray-600">
                  {compatibilityReport.isMobile ? "Mobile" : "Desktop"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">Connection</span>
                </div>
                <p className="text-lg font-semibold">
                  {isOnline ? "Online" : "Offline"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Install</span>
                </div>
                <p className="text-lg font-semibold">
                  {compatibilityReport.installSupported
                    ? "Supported"
                    : "Limited"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Notifications</span>
                </div>
                <p className="text-lg font-semibold capitalize">
                  {notificationPermission}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Browser Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(compatibilityReport.capabilities).map(
                  ([capability, supported]) => (
                    <div key={capability} className="flex items-center gap-2">
                      {supported ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm capitalize">
                        {capability.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compatibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Browser Compatibility Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Supported Features</h3>
                  <div className="space-y-2">
                    {Object.entries(compatibilityReport.capabilities)
                      .filter(([, supported]) => supported)
                      .map(([capability]) => (
                        <div
                          key={capability}
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm capitalize">
                            {capability
                              .replace(/([A-Z])/g, " $1")
                              .toLowerCase()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Unsupported Features</h3>
                  <div className="space-y-2">
                    {Object.entries(compatibilityReport.capabilities)
                      .filter(([, supported]) => !supported)
                      .map(([capability]) => (
                        <div
                          key={capability}
                          className="flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm capitalize">
                            {capability
                              .replace(/([A-Z])/g, " $1")
                              .toLowerCase()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {compatibilityReport.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recommendations</h3>
                  <div className="space-y-2">
                    {compatibilityReport.recommendations.map(
                      (recommendation, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <span className="text-sm">{recommendation}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="flex gap-2 mb-4">
            <Button onClick={runAllTests} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Run All Tests
            </Button>
          </div>

          <div className="grid gap-4">
            {[
              {
                id: "installation",
                name: "PWA Installation",
                test: testInstallation,
              },
              {
                id: "offline",
                name: "Offline Functionality",
                test: testOfflineMode,
              },
              {
                id: "notifications",
                name: "Push Notifications",
                test: testNotifications,
              },
              {
                id: "persistence",
                name: "Data Persistence",
                test: testDataPersistence,
              },
            ].map(({ id, name, test }) => {
              const result = testResults[id];
              return (
                <Card
                  key={id}
                  className={result ? getStatusColor(result.status) : ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result && getStatusIcon(result.status)}
                        <h3 className="font-semibold">{name}</h3>
                      </div>
                      <Button size="sm" variant="outline" onClick={test}>
                        Test
                      </Button>
                    </div>

                    {result && (
                      <div className="space-y-2">
                        <p className="text-sm">{result.message}</p>
                        {result.details && (
                          <div className="text-xs text-gray-600">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="responsive" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Responsive Design Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Test how the PWA behaves across different screen sizes and
                orientations.
              </p>
              <Button
                onClick={() => setShowResponsiveTest(true)}
                className="flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                Open Responsive Test Grid
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showResponsiveTest && (
        <ResponsiveTestGrid onClose={() => setShowResponsiveTest(false)} />
      )}
    </div>
  );
};

export default CrossBrowserTestPage;
