import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  History,
  Link,
  Calendar,
  CheckCircle,
  AlertCircle,
  WifiOff,
  RefreshCw,
  Database,
} from "lucide-react";
import offlineManager from "@/lib/offline-manager";

const ScanHistory = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(offlineManager.getOnlineStatus());
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();

    // Set up offline manager listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleScanStored = () => loadHistory(); // Refresh when new scan is stored

    offlineManager.on("online", handleOnline);
    offlineManager.on("offline", handleOffline);
    offlineManager.on("scan-stored", handleScanStored);

    return () => {
      offlineManager.off("online", handleOnline);
      offlineManager.off("offline", handleOffline);
      offlineManager.off("scan-stored", handleScanStored);
    };
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from IndexedDB first (offline-capable)
      const offlineHistory = await offlineManager.getScanHistory();

      if (offlineHistory.length > 0) {
        setHistory(offlineHistory);
      } else {
        // Fallback to localStorage for backward compatibility
        const storedHistory = localStorage.getItem("qrScanHistory");
        if (storedHistory) {
          const localHistory = JSON.parse(storedHistory);
          setHistory(localHistory);

          // Migrate localStorage data to IndexedDB
          for (const item of localHistory) {
            await offlineManager.storeScanHistory({
              content: item.content,
              timestamp: item.timestamp,
              isSafe: item.isSafe,
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to load scan history:", err);
      setError("Failed to load scan history");

      // Final fallback to localStorage
      try {
        const storedHistory = localStorage.getItem("qrScanHistory");
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        }
      } catch (localErr) {
        console.error("Failed to load from localStorage:", localErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadHistory();
  };

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Scan History
            {!isOnline && (
              <div className="flex items-center gap-1 text-orange-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-normal">Offline</span>
              </div>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Offline status indicator */}
        {!isOnline && (
          <Alert className="border-orange-200 bg-orange-50">
            <Database className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-800 text-sm">
              Viewing offline data. New scans will sync when you're back online.
            </AlertDescription>
          </Alert>
        )}

        {/* Error state */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              {error}
              <Button
                onClick={handleRefresh}
                variant="link"
                className="h-auto p-0 ml-2 text-red-800 underline"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-400" />
            <p className="text-gray-500">Loading scan history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
            <p className="text-gray-500">
              No scan history yet. Start scanning QR codes!
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {history.map((item, index) => (
              <div
                key={item.id || index}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50 relative"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {item.isSafe ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Safe</span>
                      <span className="sm:hidden">✓</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Unsafe</span>
                      <span className="sm:hidden">✗</span>
                    </span>
                  )}
                </div>
                <div className="flex items-start gap-2 text-gray-800">
                  <Link className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-1" />
                  <p className="text-xs sm:text-sm break-all">{item.content}</p>
                </div>

                {/* Show offline indicator if scanned while offline */}
                {item.offline && (
                  <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    <span>Scanned offline</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanHistory;
