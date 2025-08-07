import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Wifi, AlertCircle, CheckCircle } from "lucide-react";
import offlineManager from "@/lib/offline-manager";

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(offlineManager.getOnlineStatus());
  const [showAlert, setShowAlert] = useState(false);
  const [lastStatusChange, setLastStatusChange] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastStatusChange(Date.now());
      setShowAlert(true);
      // Hide alert after 3 seconds
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastStatusChange(Date.now());
      setShowAlert(true);
    };

    // Set up event listeners
    offlineManager.on("online", handleOnline);
    offlineManager.on("offline", handleOffline);

    // Initial status check
    setIsOnline(offlineManager.getOnlineStatus());

    return () => {
      offlineManager.off("online", handleOnline);
      offlineManager.off("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {/* Status Badge - Always visible */}
      <div className="fixed top-4 right-4 z-50">
        <Badge
          variant={isOnline ? "default" : "destructive"}
          className="flex items-center gap-1 px-2 py-1"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span className="text-xs">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span className="text-xs">Offline</span>
            </>
          )}
        </Badge>
      </div>

      {/* Status Change Alert */}
      {showAlert && (
        <div className="fixed top-16 right-4 z-50 max-w-sm">
          <Alert
            className={`${
              isOnline
                ? "border-green-200 bg-green-50"
                : "border-orange-200 bg-orange-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {isOnline ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" />
              )}
              <AlertDescription
                className={`text-sm ${
                  isOnline ? "text-green-800" : "text-orange-800"
                }`}
              >
                {isOnline ? (
                  <>
                    <strong>Back online!</strong>
                    <br />
                    Syncing offline data...
                  </>
                ) : (
                  <>
                    <strong>You're offline</strong>
                    <br />
                    Some features may be limited
                  </>
                )}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
