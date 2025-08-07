/**
 * CSP Monitor Component
 * Displays Content Security Policy status and violations
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cspChecker, cspReporter } from "@/lib/csp-validator";

export function CSPMonitor() {
  const [complianceReport, setComplianceReport] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runComplianceCheck();
    loadViolations();
  }, []);

  const runComplianceCheck = async () => {
    setLoading(true);
    try {
      const report = await cspChecker.runComplianceCheck();
      setComplianceReport(report);
    } catch (error) {
      console.error("Failed to run compliance check:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = () => {
    const currentViolations = cspReporter.getViolations();
    setViolations(currentViolations);
  };

  const clearViolations = () => {
    cspReporter.clearViolations();
    setViolations([]);
  };

  const getComplianceColor = (level) => {
    switch (level) {
      case "excellent":
        return "text-green-600";
      case "good":
        return "text-blue-600";
      case "fair":
        return "text-yellow-600";
      case "poor":
        return "text-orange-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getComplianceIcon = (level) => {
    switch (level) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "fair":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "poor":
      case "critical":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!complianceReport && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            CSP Monitor
          </CardTitle>
          <CardDescription>
            Content Security Policy monitoring and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runComplianceCheck}>Run Compliance Check</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            CSP Monitor
            <Button
              variant="outline"
              size="sm"
              onClick={runComplianceCheck}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Content Security Policy monitoring and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Running compliance check...</span>
            </div>
          ) : complianceReport ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="violations">Violations</TabsTrigger>
                <TabsTrigger value="recommendations">
                  Recommendations
                </TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Overall
                          </p>
                          <p
                            className={`text-2xl font-bold ${getComplianceColor(
                              complianceReport.overall
                            )}`}
                          >
                            {complianceReport.scores.overall}%
                          </p>
                        </div>
                        {getComplianceIcon(complianceReport.overall)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Header
                          </p>
                          <p className="text-2xl font-bold">
                            {complianceReport.scores.header}%
                          </p>
                        </div>
                        {complianceReport.scores.header === 100 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Security
                          </p>
                          <p className="text-2xl font-bold">
                            {complianceReport.scores.security}%
                          </p>
                        </div>
                        {complianceReport.scores.security >= 80 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            Resources
                          </p>
                          <p className="text-2xl font-bold">
                            {complianceReport.scores.resources}%
                          </p>
                        </div>
                        {complianceReport.scores.resources >= 90 ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Compliance Level: </strong>
                    <Badge
                      variant={
                        complianceReport.overall === "excellent"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {complianceReport.overall.toUpperCase()}
                    </Badge>
                    <span className="ml-2">
                      Last checked:{" "}
                      {formatTimestamp(complianceReport.timestamp)}
                    </span>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="violations" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">CSP Violations</h3>
                  <Button variant="outline" size="sm" onClick={clearViolations}>
                    Clear All
                  </Button>
                </div>

                {violations.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No CSP violations detected. Your application is complying
                      with the security policy.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {violations.slice(0, 10).map((violation, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="destructive">
                                  {violation.directive}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {formatTimestamp(violation.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                Blocked URI: {violation.blockedURI}
                              </p>
                              {violation.sourceFile && (
                                <p className="text-sm text-gray-600">
                                  Source: {violation.sourceFile}:
                                  {violation.lineNumber}
                                </p>
                              )}
                            </div>
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {violations.length > 10 && (
                      <p className="text-sm text-gray-600 text-center">
                        Showing 10 of {violations.length} violations
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Security Recommendations
                </h3>

                {complianceReport.recommendations.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      No recommendations at this time. Your CSP configuration
                      looks good!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {complianceReport.recommendations.map((rec, index) => (
                      <Alert
                        key={index}
                        variant={
                          rec.priority === "critical"
                            ? "destructive"
                            : "default"
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                rec.priority === "critical"
                                  ? "destructive"
                                  : rec.priority === "high"
                                  ? "destructive"
                                  : rec.priority === "medium"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <span className="font-medium">{rec.message}</span>
                          </div>
                          <p className="text-sm mt-1">{rec.action}</p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <h3 className="text-lg font-semibold">Technical Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">CSP Header</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        {complianceReport.details.headerPresent ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Present</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm">Missing</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Unsafe Directives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {complianceReport.details.unsafeDirectives.details
                          .length === 0 ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">None detected</span>
                          </div>
                        ) : (
                          complianceReport.details.unsafeDirectives.details.map(
                            (detail, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm">{detail}</span>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {complianceReport.details.resourceValidation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Resource Validation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Scripts</p>
                          <p>
                            {complianceReport.details.resourceValidation.scripts
                              ?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Styles</p>
                          <p>
                            {complianceReport.details.resourceValidation.styles
                              ?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Images</p>
                          <p>
                            {complianceReport.details.resourceValidation.images
                              ?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Fonts</p>
                          <p>
                            {complianceReport.details.resourceValidation.fonts
                              ?.length || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load compliance report. Please try refreshing.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CSPMonitor;
