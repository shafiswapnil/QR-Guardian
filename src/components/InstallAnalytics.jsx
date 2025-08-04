import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, Users, AlertCircle, Trash2 } from "lucide-react";
import { useInstallPrompt } from "../hooks/use-install-prompt";

/**
 * InstallAnalytics Component
 *
 * Displays PWA installation analytics and metrics for debugging and monitoring.
 * Shows install success rates, browser compatibility, and user behavior patterns.
 *
 * Requirements addressed:
 * - 1.1: Track install prompt display and user interactions
 * - 1.2: Monitor install success rates across different browsers
 */
const InstallAnalytics = () => {
  const { getInstallAnalytics, browserInfo, isInstalled, isInstallable } =
    useInstallPrompt();
  const [analytics, setAnalytics] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Load analytics data
    const loadAnalytics = () => {
      const data = getInstallAnalytics();
      setAnalytics(data);
    };

    loadAnalytics();

    // Listen for new install events
    const handleInstallEvent = () => {
      loadAnalytics();
    };

    window.addEventListener("pwa-install-event", handleInstallEvent);

    return () => {
      window.removeEventListener("pwa-install-event", handleInstallEvent);
    };
  }, [getInstallAnalytics]);

  // Clear analytics data
  const clearAnalytics = () => {
    localStorage.removeItem("pwa_install_events");
    setAnalytics({
      totalEvents: 0,
      promptsShown: 0,
      installs: 0,
      dismissals: 0,
      errors: 0,
      lastEvent: null,
      events: [],
    });
  };

  // Calculate success rate
  const getSuccessRate = () => {
    if (!analytics || analytics.promptsShown === 0) return 0;
    return Math.round((analytics.installs / analytics.promptsShown) * 100);
  };

  // Get browser compatibility status
  const getBrowserStatus = () => {
    if (isInstalled) return { status: "installed", color: "green" };
    if (isInstallable) return { status: "installable", color: "blue" };
    if (browserInfo.supportsInstall)
      return { status: "supported", color: "yellow" };
    return { status: "not_supported", color: "red" };
  };

  const browserStatus = getBrowserStatus();

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Install Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            PWA Install Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge
              variant={
                browserStatus.color === "green" ? "default" : "secondary"
              }
              className={
                browserStatus.color === "green"
                  ? "bg-green-100 text-green-800"
                  : browserStatus.color === "blue"
                  ? "bg-blue-100 text-blue-800"
                  : browserStatus.color === "yellow"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {browserStatus.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Browser:</span>
            <span className="text-sm text-gray-600 capitalize">
              {browserInfo.type}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Install Support:</span>
            <Badge
              variant={browserInfo.supportsInstall ? "default" : "secondary"}
            >
              {browserInfo.supportsInstall ? "Yes" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Install Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.promptsShown}
              </div>
              <div className="text-sm text-gray-600">Prompts Shown</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {analytics.installs}
              </div>
              <div className="text-sm text-gray-600">Installs</div>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {analytics.dismissals}
              </div>
              <div className="text-sm text-gray-600">Dismissals</div>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {analytics.errors}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
          </div>

          {analytics.promptsShown > 0 && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">
                {getSuccessRate()}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          )}

          {analytics.lastEvent && (
            <div className="text-sm text-gray-600">
              <strong>Last Event:</strong> {analytics.lastEvent.action}
              <span className="ml-2">
                ({new Date(analytics.lastEvent.data.timestamp).toLocaleString()}
                )
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details */}
      {analytics.totalEvents > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Event Details ({analytics.totalEvents})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "Hide" : "Show"} Details
              </Button>
            </CardTitle>
          </CardHeader>

          {showDetails && (
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {analytics.events
                  .slice(-10)
                  .reverse()
                  .map((event, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.action}
                        </Badge>
                        <span className="text-gray-600">
                          {event.data.browser || "unknown"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(event.data.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAnalytics}
                  className="w-full text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Analytics Data
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Install Help
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Chrome/Edge:</strong> Automatic install prompt available
          </p>
          <p>
            <strong>Safari:</strong> Use Share → Add to Home Screen
          </p>
          <p>
            <strong>Firefox:</strong> Limited PWA support, use bookmark
          </p>
          <p>
            <strong>Success Rate:</strong> Percentage of prompts that led to
            installs
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallAnalytics;
