import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Download, X, RefreshCw, AlertCircle } from "lucide-react";
import updateManager from "../lib/update-manager";

const UpdateBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerData, setBannerData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleUpdateBanner = (data) => {
      setBannerData(data);
      setShowBanner(true);
      setIsDismissed(false);
      setError(null);
    };

    const handleUpdateStarted = () => {
      setIsUpdating(true);
    };

    const handleUpdateError = (errorData) => {
      if (
        errorData.type === "update-apply-failed" ||
        errorData.type === "update-failed"
      ) {
        setError(errorData);
        setIsUpdating(false);
      }
    };

    const handleUpdateActivated = () => {
      setShowBanner(false);
      setIsUpdating(false);
      setError(null);
    };

    const handleUpdateAvailable = () => {
      // Reset dismissed state when new update is available
      setIsDismissed(false);
    };

    // Listen for update events
    updateManager.on("updatebanner", handleUpdateBanner);
    updateManager.on("updatestarted", handleUpdateStarted);
    updateManager.on("error", handleUpdateError);
    updateManager.on("updateactivated", handleUpdateActivated);
    updateManager.on("updateavailable", handleUpdateAvailable);

    return () => {
      updateManager.off("updatebanner", handleUpdateBanner);
      updateManager.off("updatestarted", handleUpdateStarted);
      updateManager.off("error", handleUpdateError);
      updateManager.off("updateactivated", handleUpdateActivated);
      updateManager.off("updateavailable", handleUpdateAvailable);
    };
  }, []);

  const handleUpdateNow = async () => {
    try {
      setError(null);
      await updateManager.applyUpdate();
    } catch (err) {
      setError({
        type: "update-failed",
        message: "Failed to apply update",
        error: err,
      });
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
  };

  const handleRetry = () => {
    setError(null);
    handleUpdateNow();
  };

  if (!showBanner || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
      <Card className="w-full max-w-md shadow-lg border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-0.5">
                <Download className="h-5 w-5 text-blue-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-blue-900">
                    {bannerData?.title || "Update Available"}
                  </h4>
                  {bannerData?.version && (
                    <Badge variant="secondary" className="text-xs">
                      {bannerData.version}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-blue-700 mb-3">
                  {bannerData?.message || "A new version is ready to install"}
                </p>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-100 p-2 rounded mb-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs">
                      {error.message || "Update failed. Please try again."}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  {error ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={isUpdating}
                      className="text-xs"
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleUpdateNow}
                      disabled={isUpdating}
                      className="text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3 mr-1" />
                          Update
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-shrink-0 h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateBanner;
