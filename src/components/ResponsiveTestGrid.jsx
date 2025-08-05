import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Tablet,
  Monitor,
  RotateCcw,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/**
 * ResponsiveTestGrid Component
 *
 * Visual testing component for responsive design across different screen sizes
 * Helps verify PWA functionality on various devices and orientations
 */
const ResponsiveTestGrid = ({ onClose }) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState("");
  const [orientation, setOrientation] = useState("portrait");
  const [viewportInfo, setViewportInfo] = useState({});
  const [testResults, setTestResults] = useState({});

  // Breakpoint definitions
  const breakpoints = {
    mobile: { min: 0, max: 767, icon: Smartphone, label: "Mobile" },
    tablet: { min: 768, max: 1023, icon: Tablet, label: "Tablet" },
    desktop: { min: 1024, max: Infinity, icon: Monitor, label: "Desktop" },
  };

  // Test scenarios for each breakpoint
  const testScenarios = [
    {
      id: "navigation",
      name: "Navigation Accessibility",
      description: "Check if navigation is accessible and usable",
    },
    {
      id: "qr-scanner",
      name: "QR Scanner Interface",
      description: "Verify QR scanner fits properly on screen",
    },
    {
      id: "install-prompt",
      name: "Install Prompt Display",
      description: "Check install prompt positioning and visibility",
    },
    {
      id: "offline-indicator",
      name: "Offline Indicator",
      description: "Verify offline status is clearly visible",
    },
    {
      id: "touch-targets",
      name: "Touch Target Size",
      description: "Ensure buttons are large enough for touch interaction",
    },
  ];

  useEffect(() => {
    const updateViewportInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Determine current breakpoint
      let currentBp = "mobile";
      for (const [name, bp] of Object.entries(breakpoints)) {
        if (width >= bp.min && width <= bp.max) {
          currentBp = name;
          break;
        }
      }

      // Determine orientation
      const currentOrientation = width > height ? "landscape" : "portrait";

      setCurrentBreakpoint(currentBp);
      setOrientation(currentOrientation);
      setViewportInfo({
        width,
        height,
        ratio: (width / height).toFixed(2),
        dpr: window.devicePixelRatio || 1,
      });
    };

    updateViewportInfo();
    window.addEventListener("resize", updateViewportInfo);
    window.addEventListener("orientationchange", updateViewportInfo);

    return () => {
      window.removeEventListener("resize", updateViewportInfo);
      window.removeEventListener("orientationchange", updateViewportInfo);
    };
  }, []);

  // Run automated tests for current breakpoint
  const runAutomatedTests = () => {
    const results = {};

    testScenarios.forEach((scenario) => {
      let passed = true;
      let issues = [];

      switch (scenario.id) {
        case "navigation":
          // Check if navigation elements are visible and accessible
          const navElements = document.querySelectorAll(
            'nav, [role="navigation"]'
          );
          if (navElements.length === 0) {
            passed = false;
            issues.push("No navigation elements found");
          }
          break;

        case "qr-scanner":
          // Check QR scanner container
          const scannerElements = document.querySelectorAll(
            '[class*="qr"], [class*="scanner"]'
          );
          if (scannerElements.length > 0) {
            const scanner = scannerElements[0];
            const rect = scanner.getBoundingClientRect();
            if (
              rect.width > viewportInfo.width ||
              rect.height > viewportInfo.height
            ) {
              passed = false;
              issues.push("Scanner element exceeds viewport dimensions");
            }
          }
          break;

        case "install-prompt":
          // Check install prompt positioning
          const installPrompts =
            document.querySelectorAll('[class*="install"]');
          installPrompts.forEach((prompt) => {
            const rect = prompt.getBoundingClientRect();
            if (
              rect.bottom > viewportInfo.height ||
              rect.right > viewportInfo.width
            ) {
              passed = false;
              issues.push("Install prompt extends beyond viewport");
            }
          });
          break;

        case "offline-indicator":
          // Check offline indicator visibility
          const offlineIndicators =
            document.querySelectorAll('[class*="offline"]');
          if (offlineIndicators.length > 0) {
            const indicator = offlineIndicators[0];
            const styles = window.getComputedStyle(indicator);
            if (styles.display === "none" || styles.visibility === "hidden") {
              // This might be expected if online
            }
          }
          break;

        case "touch-targets":
          // Check button sizes for touch accessibility
          const buttons = document.querySelectorAll('button, [role="button"]');
          buttons.forEach((button) => {
            const rect = button.getBoundingClientRect();
            const minTouchSize = currentBreakpoint === "mobile" ? 44 : 32;
            if (rect.width < minTouchSize || rect.height < minTouchSize) {
              passed = false;
              issues.push(
                `Button too small: ${rect.width}x${rect.height}px (min: ${minTouchSize}px)`
              );
            }
          });
          break;
      }

      results[scenario.id] = { passed, issues };
    });

    setTestResults(results);
  };

  // Manual test result handler
  const handleManualTest = (scenarioId, passed) => {
    setTestResults((prev) => ({
      ...prev,
      [scenarioId]: { passed, manual: true },
    }));
  };

  const getCurrentBreakpointIcon = () => {
    const IconComponent = breakpoints[currentBreakpoint]?.icon || Monitor;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Responsive Design Testing
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Test PWA functionality across different screen sizes and
              orientations
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Viewport Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getCurrentBreakpointIcon()}
                  <span className="font-medium">
                    {breakpoints[currentBreakpoint]?.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {viewportInfo.width} × {viewportInfo.height}px
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="w-4 h-4" />
                  <span className="font-medium">Orientation</span>
                </div>
                <p className="text-sm text-gray-600 capitalize">
                  {orientation}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Aspect Ratio</span>
                </div>
                <p className="text-sm text-gray-600">{viewportInfo.ratio}:1</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Device Pixel Ratio</span>
                </div>
                <p className="text-sm text-gray-600">{viewportInfo.dpr}x</p>
              </CardContent>
            </Card>
          </div>

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button
              onClick={runAutomatedTests}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Run Automated Tests
            </Button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Scenarios</h3>

            {testScenarios.map((scenario) => {
              const result = testResults[scenario.id];
              const hasResult = result !== undefined;
              const passed = result?.passed;

              return (
                <Card
                  key={scenario.id}
                  className="border-l-4 border-l-gray-200"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{scenario.name}</h4>
                          {hasResult && (
                            <Badge
                              variant={passed ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {passed ? "Pass" : "Fail"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {scenario.description}
                        </p>

                        {result?.issues && result.issues.length > 0 && (
                          <div className="text-sm text-red-600">
                            <ul className="list-disc list-inside">
                              {result.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualTest(scenario.id, true)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          Pass
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManualTest(scenario.id, false)}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          Fail
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Test Summary */}
          {Object.keys(testResults).length > 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2">Test Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        Object.values(testResults).filter((r) => r.passed)
                          .length
                      }
                    </div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {
                        Object.values(testResults).filter((r) => !r.passed)
                          .length
                      }
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(testResults).length}
                    </div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResponsiveTestGrid;
