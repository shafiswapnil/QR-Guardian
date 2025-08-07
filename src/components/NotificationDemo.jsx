/**
 * NotificationDemo - Component for testing notification functionality
 * This is a temporary component for development/testing purposes
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NotificationManager from "../lib/notification-manager";
import { Bell, Shield, Download, AlertTriangle } from "lucide-react";

const NotificationDemo = () => {
  const [notificationManager] = useState(() => new NotificationManager());
  const [permissionStatus, setPermissionStatus] = useState(
    notificationManager.getPermissionStatus()
  );
  const [isSupported, setIsSupported] = useState(
    notificationManager.isNotificationSupported()
  );

  const requestPermission = async () => {
    const granted = await notificationManager.requestPermission();
    setPermissionStatus(notificationManager.getPermissionStatus());

    if (granted) {
      // Set up service worker registration
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          notificationManager.setServiceWorkerRegistration(registration);
        } catch (error) {
          console.error(
            "Failed to set up service worker for notifications:",
            error
          );
        }
      }
    }
  };

  const showUpdateNotification = async () => {
    await notificationManager.showUpdateNotification("2.1.0");
  };

  const showSecurityAlert = async () => {
    const threat = {
      description: "Suspicious QR code detected with potential malware",
      severity: "high",
      type: "malicious-qr",
    };
    await notificationManager.showSecurityAlert(threat);
  };

  const showGeneralNotification = async () => {
    await notificationManager.showAppNotification(
      "This is a test notification from QR Guardian!"
    );
  };

  const showCriticalAlert = async () => {
    const threat = {
      description: "Critical security vulnerability detected",
      severity: "critical",
      type: "security-breach",
    };
    await notificationManager.showSecurityAlert(threat);
  };

  const getPermissionBadgeVariant = () => {
    switch (permissionStatus) {
      case "granted":
        return "default";
      case "denied":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Demo
        </CardTitle>
        <CardDescription>Test the push notification system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Support Status:</span>
            <Badge variant={isSupported ? "default" : "destructive"}>
              {isSupported ? "Supported" : "Not Supported"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Permission:</span>
            <Badge variant={getPermissionBadgeVariant()}>
              {permissionStatus}
            </Badge>
          </div>
        </div>

        {/* Permission Request */}
        {permissionStatus !== "granted" && (
          <Button
            onClick={requestPermission}
            className="w-full"
            disabled={!isSupported}
          >
            <Bell className="w-4 h-4 mr-2" />
            Request Permission
          </Button>
        )}

        {/* Notification Tests */}
        {permissionStatus === "granted" && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Test Notifications:</h4>

            <Button
              onClick={showGeneralNotification}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              General Notification
            </Button>

            <Button
              onClick={showUpdateNotification}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Update Available
            </Button>

            <Button
              onClick={showSecurityAlert}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security Alert
            </Button>

            <Button
              onClick={showCriticalAlert}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Critical Alert
            </Button>
          </div>
        )}

        {!isSupported && (
          <div className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-md">
            Notifications are not supported in this browser or environment.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationDemo;
