import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  WifiOff,
  RefreshCw,
  QrCode,
  History,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import offlineManager from "@/lib/offline-manager";

const OfflineFallback = ({
  feature,
  onRetry,
  showAvailableFeatures = true,
  availableOfflineFeatures = [],
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [storageStats, setStorageStats] = useState(null);

  useEffect(() => {
    // Get storage statistics
    const getStats = async () => {
      const stats = await offlineManager.getStorageStats();
      setStorageStats(stats);
    };
    getStats();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry behavior - check network and reload
        window.location.reload();
      }
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  const defaultOfflineFeatures = [
    {
      icon: QrCode,
      title: "Generate QR Codes",
      description: "Create QR codes from text - works completely offline",
      available: true,
    },
    {
      icon: History,
      title: "View Scan History",
      description: `Access your ${storageStats?.scanHistory || 0} saved scans`,
      available: storageStats?.scanHistory > 0,
    },
  ];

  const features =
    availableOfflineFeatures.length > 0
      ? availableOfflineFeatures
      : defaultOfflineFeatures;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Main offline message */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <WifiOff className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              {feature ? `${feature} Unavailable` : "You're Offline"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              {feature
                ? `${feature} requires an internet connection. Please check your network and try again.`
                : "Some features require an internet connection, but you can still use QR Guardian offline."}
            </p>

            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
              variant="outline"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRetrying ? "animate-spin" : ""}`}
              />
              {isRetrying ? "Checking..." : "Try Again"}
            </Button>
          </CardContent>
        </Card>

        {/* Available offline features */}
        {showAvailableFeatures && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Available Offline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      feature.available
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200 opacity-60"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 mt-0.5 ${
                        feature.available ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-medium text-sm ${
                          feature.available ? "text-green-900" : "text-gray-500"
                        }`}
                      >
                        {feature.title}
                      </h4>
                      <p
                        className={`text-xs mt-1 ${
                          feature.available ? "text-green-700" : "text-gray-400"
                        }`}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Offline data info */}
        {storageStats &&
          (storageStats.scanHistory > 0 || storageStats.requestQueue > 0) && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Offline Data:</strong>
                <br />
                {storageStats.scanHistory > 0 &&
                  `${storageStats.scanHistory} saved scans`}
                {storageStats.scanHistory > 0 &&
                  storageStats.requestQueue > 0 &&
                  ", "}
                {storageStats.requestQueue > 0 &&
                  `${storageStats.requestQueue} pending sync${
                    storageStats.requestQueue > 1 ? "s" : ""
                  }`}
              </AlertDescription>
            </Alert>
          )}

        {/* Network tips */}
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-sm text-gray-900 mb-2">
              Connection Tips:
            </h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Check your WiFi or mobile data connection</li>
              <li>• Try moving to an area with better signal</li>
              <li>• Restart your network connection</li>
              <li>• Your offline data will sync when reconnected</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfflineFallback;
