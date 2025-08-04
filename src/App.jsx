import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRScanner from "./components/QRScanner";
import QRGenerator from "./components/QRGenerator";
import SafetyChecker from "./components/SafetyChecker";
import NearbySharing from "./components/NearbySharing";
import ScanHistory from "./components/ScanHistory";
import OfflineIndicator from "./components/OfflineIndicator";
import { QrCode, Scan, Shield, Share2, History } from "lucide-react";
import { useIsMobile } from "./hooks/use-mobile";
import offlineManager from "./lib/offline-manager";
import NotificationManager from "./lib/notification-manager";
import { maliciousQRDetectedTemplate } from "./lib/notification-templates";
import "./App.css";

function App() {
  const [scannedUrl, setScannedUrl] = useState("");
  const [activeTab, setActiveTab] = useState("scanner");
  const [contentToShare, setContentToShare] = useState("");
  const [scanHistory, setScanHistory] = useState([]);
  const [isOffline, setIsOffline] = useState(!offlineManager.getOnlineStatus());
  const [notificationManager] = useState(() => new NotificationManager());
  const isMobile = useIsMobile();

  useEffect(() => {
    // Set up offline manager listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    offlineManager.on("online", handleOnline);
    offlineManager.on("offline", handleOffline);

    // Initialize notification manager
    const initializeNotifications = async () => {
      try {
        // Request notification permission on app load
        const hasPermission = await notificationManager.requestPermission();
        if (hasPermission) {
          console.log("Notification permission granted");
        }

        // Set up service worker registration for notifications
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;
          notificationManager.setServiceWorkerRegistration(registration);
        }
      } catch (error) {
        console.error("Failed to initialize notifications:", error);
      }
    };

    // Load initial scan history from IndexedDB
    const loadInitialHistory = async () => {
      try {
        const history = await offlineManager.getScanHistory();
        setScanHistory(history);
      } catch (error) {
        console.error("Failed to load initial scan history:", error);
        // Fallback to localStorage
        const storedHistory = localStorage.getItem("qrScanHistory");
        if (storedHistory) {
          setScanHistory(JSON.parse(storedHistory));
        }
      }
    };

    initializeNotifications();
    loadInitialHistory();

    return () => {
      offlineManager.off("online", handleOnline);
      offlineManager.off("offline", handleOffline);
    };
  }, [notificationManager]);

  const handleScanSuccess = (decodedText) => {
    console.log("QR Code scanned:", decodedText);
    setScannedUrl(decodedText);
    setContentToShare(decodedText);
    setActiveTab("safety");

    // Improved safety check that matches SafetyChecker logic
    const checkInitialSafety = (url) => {
      try {
        // Basic URL validation
        const validUrl = new URL(
          url.startsWith("http") ? url : `https://${url}`
        );

        // Check for suspicious patterns
        const suspiciousPatterns = [
          /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly/i, // URL shorteners
          /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, // IP addresses
          /[a-z0-9]{20,}\.com/i, // Suspicious long random domains
          /phishing|malware|virus|hack|scam/i, // Suspicious keywords
        ];

        const isSuspicious = suspiciousPatterns.some((pattern) =>
          pattern.test(url)
        );
        const isHttps = validUrl.protocol === "https:";

        // Return false for suspicious URLs, true for others (including HTTP with warning)
        return !isSuspicious;
      } catch {
        return false; // Invalid URLs are unsafe
      }
    };

    const isSafe = checkInitialSafety(decodedText);

    // Show security notification for malicious QR codes
    // Requirement 4.2: When security threats are detected THEN the user SHALL receive appropriate alerts
    if (!isSafe) {
      const threat = {
        type: "malicious-qr",
        description: "Potentially harmful QR code detected",
        content: decodedText,
        reason: "Contains suspicious patterns or invalid URL",
        severity: "high",
      };

      notificationManager.showSecurityAlert(threat).catch((error) => {
        console.error("Failed to show security notification:", error);
      });
    }

    const newScan = {
      content: decodedText,
      timestamp: new Date().toISOString(),
      isSafe: isSafe,
    };

    // Store in IndexedDB for offline access
    offlineManager
      .storeScanHistory(newScan)
      .then(() => {
        // Update local state
        setScanHistory((prevHistory) => [newScan, ...prevHistory]);
      })
      .catch((error) => {
        console.error("Failed to store scan history offline:", error);
        // Fallback to localStorage and local state
        const updatedHistory = [newScan, ...scanHistory];
        setScanHistory(updatedHistory);
        localStorage.setItem("qrScanHistory", JSON.stringify(updatedHistory));
      });
  };

  const handleScanError = (error) => {
    console.warn("QR Scan error:", error);
  };

  const handleShare = (content, qrCodeUrl) => {
    setContentToShare(content);
    setActiveTab("share");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:p-6 md:p-8">
      {/* Offline status indicator */}
      <OfflineIndicator />

      <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            QR Scanner & Generator
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-center text-gray-600 mb-6 sm:mb-8 px-2">
            Scan QR codes safely, generate new ones, and share with nearby
            devices
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList
            className={`grid w-full mb-6 sm:mb-8 ${
              isMobile ? "grid-cols-2 gap-1 h-auto p-1" : "grid-cols-5"
            }`}
          >
            <TabsTrigger
              value="scanner"
              className={`flex items-center gap-1 sm:gap-2 ${
                isMobile
                  ? "min-h-[44px] text-xs sm:text-sm flex-col sm:flex-row p-2"
                  : ""
              }`}
            >
              <Scan className="w-4 h-4" />
              <span className={isMobile ? "hidden sm:inline" : ""}>
                Scanner
              </span>
              <span className={isMobile ? "sm:hidden" : "hidden"}>Scan</span>
            </TabsTrigger>
            <TabsTrigger
              value="safety"
              className={`flex items-center gap-1 sm:gap-2 ${
                isMobile
                  ? "min-h-[44px] text-xs sm:text-sm flex-col sm:flex-row p-2"
                  : ""
              }`}
            >
              <Shield className="w-4 h-4" />
              Safety
            </TabsTrigger>
            <TabsTrigger
              value="generator"
              className={`flex items-center gap-1 sm:gap-2 ${
                isMobile
                  ? "min-h-[44px] text-xs sm:text-sm flex-col sm:flex-row p-2 col-span-2 sm:col-span-1"
                  : ""
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className={isMobile ? "hidden sm:inline" : ""}>
                Generator
              </span>
              <span className={isMobile ? "sm:hidden" : "hidden"}>
                Generate
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="share"
              className={`flex items-center gap-1 sm:gap-2 ${
                isMobile
                  ? "min-h-[44px] text-xs sm:text-sm flex-col sm:flex-row p-2"
                  : ""
              }`}
            >
              <Share2 className="w-4 h-4" />
              Share
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={`flex items-center gap-1 sm:gap-2 ${
                isMobile
                  ? "min-h-[44px] text-xs sm:text-sm flex-col sm:flex-row p-2"
                  : ""
              }`}
            >
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner" className="space-y-6">
            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={handleScanError}
            />
          </TabsContent>

          <TabsContent value="safety" className="space-y-6">
            <SafetyChecker
              scannedUrl={scannedUrl}
              onCheck={(result) => {
                setScanHistory((prevHistory) => {
                  const updatedHistory = [...prevHistory];
                  if (updatedHistory.length > 0) {
                    updatedHistory[0].isSafe = result.isSafe;
                  }
                  return updatedHistory;
                });
              }}
            />
            {!scannedUrl && (
              <div className="text-center text-gray-500 py-8">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Scan a QR code first to check its safety</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <QRGenerator onShare={handleShare} />
          </TabsContent>

          <TabsContent value="share" className="space-y-6">
            <NearbySharing contentToShare={contentToShare} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <ScanHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
