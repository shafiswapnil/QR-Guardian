import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  History,
  Shield,
} from "lucide-react";
import updateManager from "../lib/update-manager";

const UpdateStatus = ({ className = "" }) => {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [rollbackInfo, setRollbackInfo] = useState(null);

  useEffect(() => {
    // Get initial status
    updateStatus();

    const handleUpdateCheck = (data) => {
      setLastCheck(data.timestamp);
      setIsChecking(false);
      setError(null);
    };

    const handleUpdateAvailable = (data) => {
      refreshStatus();
    };

    const handleUpdateActivated = (data) => {
      refreshStatus();
      setError(null);
    };

    const handleError = (errorData) => {
      setError(errorData);
      setIsChecking(false);
      refreshStatus();
    };

    const handleRollbackStarted = (data) => {
      setRollbackInfo({ status: "started", data });
    };

    const handleRollbackCompleted = (data) => {
      setRollbackInfo({ status: "completed", data });
    };

    const handleRollbackFailed = (data) => {
      setRollbackInfo({ status: "failed", data });
    };

    // Listen for update events
    updateManager.on("updatecheck", handleUpdateCheck);
    updateManager.on("updateavailable", handleUpdateAvailable);
    updateManager.on("updateactivated", handleUpdateActivated);
    updateManager.on("error", handleError);
    updateManager.on("rollbackstarted", handleRollbackStarted);
    updateManager.on("rollbackcompleted", handleRollbackCompleted);
    updateManager.on("rollbackfailed", handleRollbackFailed);

    return () => {
      updateManager.off("updatecheck", handleUpdateCheck);
      updateManager.off("updateavailable", handleUpdateAvailable);
      updateManager.off("updateactivated", handleUpdateActivated);
      updateManager.off("error", handleError);
      updateManager.off("rollbackstarted", handleRollbackStarted);
      updateManager.off("rollbackcompleted", handleRollbackCompleted);
      updateManager.off("rollbackfailed", handleRollbackFailed);
    };
  }, []);

  const refreshStatus = () => {
    const status = updateManager.getUpdateStatus();
    setUpdateStatus(status);
  };

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    setError(null);

    try {
      await updateManager.forceUpdateCheck();
    } catch (err) {
      setError({
        type: "manual-check-failed",
        message: "Failed to check for updates",
        error: err,
      });
    }
  };

  const handleApplyUpdate = async () => {
    try {
      setError(null);
      await updateManager.applyUpdate();
    } catch (err) {
      setError({
        type: "manual-update-failed",
        message: "Failed to apply update",
        error: err,
      });
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = () => {
    if (updateStatus?.isUpdating) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      );
    }

    if (updateStatus?.updateAvailable) {
      return <Download className="h-4 w-4 text-blue-600" />;
    }

    if (error) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }

    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  const getStatusText = () => {
    if (updateStatus?.isUpdating) {
      return "Updating...";
    }

    if (updateStatus?.updateAvailable) {
      return "Update Available";
    }

    if (error) {
      return "Update Error";
    }

    return "Up to Date";
  };

  const getStatusColor = () => {
    if (updateStatus?.isUpdating) {
      return "bg-blue-50 border-blue-200";
    }

    if (updateStatus?.updateAvailable) {
      return "bg-blue-50 border-blue-200";
    }

    if (error) {
      return "bg-red-50 border-red-200";
    }

    return "bg-green-50 border-green-200";
  };

  return (
    <Card className={`${className} ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">App Updates</CardTitle>
          </div>
          <Badge
            variant={updateStatus?.updateAvailable ? "default" : "secondary"}
          >
            {getStatusText()}
          </Badge>
        </div>
        <CardDescription>
          Manage app updates and version information
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Update Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Check:</span>
            <span>{formatTimestamp(updateStatus?.lastUpdateCheck)}</span>
          </div>

          {updateStatus?.updateMetadata && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available Version:</span>
              <Badge variant="outline">
                {updateStatus.updateMetadata.version}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Prompt Attempts:</span>
            <span>{updateStatus?.promptAttempts || 0}/3</span>
          </div>
        </div>

        <Separator />

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {error.message || "An error occurred"}
              </p>
              {error.type && (
                <p className="text-xs text-red-600 mt-1">
                  Error type: {error.type}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rollback Information */}
        {rollbackInfo && (
          <div className="flex items-start gap-2 p-3 bg-amber-100 border border-amber-200 rounded-lg">
            <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Rollback {rollbackInfo.status}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {rollbackInfo.status === "started" &&
                  "Attempting to restore previous version..."}
                {rollbackInfo.status === "completed" &&
                  "Successfully restored previous version"}
                {rollbackInfo.status === "failed" &&
                  "Failed to restore previous version"}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckForUpdates}
            disabled={isChecking || updateStatus?.isUpdating}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Check Now
              </>
            )}
          </Button>

          {updateStatus?.updateAvailable && (
            <Button
              size="sm"
              onClick={handleApplyUpdate}
              disabled={updateStatus?.isUpdating}
              className="flex-1"
            >
              {updateStatus?.isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 mr-2" />
                  Update Now
                </>
              )}
            </Button>
          )}
        </div>

        {/* Test Actions (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Development Testing
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateManager.updateAvailable = true;
                    updateManager.updateMetadata = {
                      version: "test-1.0.0",
                      timestamp: Date.now(),
                    };
                    updateManager.showUpdatePrompt();
                    refreshStatus();
                  }}
                  className="flex-1 text-xs"
                >
                  Test Prompt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateManager.updateAvailable = true;
                    updateManager.updateMetadata = {
                      version: "test-1.0.0",
                      timestamp: Date.now(),
                    };
                    updateManager.showUpdateBanner();
                    refreshStatus();
                  }}
                  className="flex-1 text-xs"
                >
                  Test Banner
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Automatic checks every 30 minutes</span>
          </div>

          {updateStatus?.hasRollbackData && (
            <div className="flex items-center gap-1">
              <History className="h-3 w-3" />
              <span>Rollback data available</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {navigator.onLine ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Online - Updates available</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Offline - Updates paused</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateStatus;
