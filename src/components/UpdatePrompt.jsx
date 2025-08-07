import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Download, X, Clock, AlertCircle } from "lucide-react";
import updateManager from "../lib/update-manager";

const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleUpdatePrompt = (data) => {
      setUpdateData(data);
      setShowPrompt(true);
      setError(null);
    };

    const handleUpdateStarted = () => {
      setIsUpdating(true);
    };

    const handleUpdateError = (errorData) => {
      setError(errorData);
      setIsUpdating(false);
    };

    const handleUpdatePromptDismissed = () => {
      setShowPrompt(false);
    };

    // Listen for update events
    updateManager.on("updateprompt", handleUpdatePrompt);
    updateManager.on("updatestarted", handleUpdateStarted);
    updateManager.on("error", handleUpdateError);
    updateManager.on("updatepromptdismissed", handleUpdatePromptDismissed);

    return () => {
      updateManager.off("updateprompt", handleUpdatePrompt);
      updateManager.off("updatestarted", handleUpdateStarted);
      updateManager.off("error", handleUpdateError);
      updateManager.off("updatepromptdismissed", handleUpdatePromptDismissed);
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

  const handlePostpone = () => {
    updateManager.postponeUpdate(3600000); // 1 hour
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    updateManager.dismissUpdatePrompt();
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <AlertDialog open={showPrompt} onOpenChange={setShowPrompt}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            <AlertDialogTitle>
              {updateData?.title || "Update Available"}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              {updateData?.message ||
                "A new version of QR Guardian is available."}
            </p>

            {updateData?.version && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Version:</span>
                <Badge variant="outline">{updateData.version}</Badge>
              </div>
            )}

            {updateData?.attempt > 1 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Update reminder ({updateData.attempt}/{3})
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  {error.message || "Update failed. Please try again."}
                </span>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <AlertDialogCancel
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </AlertDialogCancel>

            <Button
              variant="outline"
              onClick={handlePostpone}
              disabled={isUpdating}
              className="flex-1 sm:flex-none"
            >
              <Clock className="h-4 w-4 mr-2" />
              Later
            </Button>
          </div>

          <AlertDialogAction
            onClick={handleUpdateNow}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Update Now
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UpdatePrompt;
