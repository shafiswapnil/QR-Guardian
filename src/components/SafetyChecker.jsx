import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

const SafetyChecker = ({ scannedUrl, onCheck }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [safetyResult, setSafetyResult] = useState(null);

  // Simple URL validation and basic safety checks
  const checkURLSafety = async (urlToCheck) => {
    setIsChecking(true);

    try {
      // Basic URL validation
      let validUrl;
      try {
        validUrl = new URL(
          urlToCheck.startsWith("http") ? urlToCheck : `https://${urlToCheck}`
        );
      } catch {
        setSafetyResult({
          isSafe: false,
          risk: "high",
          reason: "Invalid URL format",
          details: "The scanned content does not appear to be a valid URL.",
        });
        setIsChecking(false);
        return;
      }

      // Basic safety heuristics (in a real app, you'd use an API like Google Safe Browsing)
      const suspiciousPatterns = [
        /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly/i, // URL shorteners
        /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, // IP addresses
        /[a-z0-9]{20,}\.com/i, // Suspicious long random domains
        /phishing|malware|virus|hack|scam/i, // Suspicious keywords
      ];

      const isSuspicious = suspiciousPatterns.some((pattern) =>
        pattern.test(urlToCheck)
      );

      // Check for HTTPS
      const isHttps = validUrl.protocol === "https:";

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      let result;
      if (isSuspicious) {
        result = {
          isSafe: false,
          risk: "high",
          reason: "Potentially suspicious URL detected",
          details:
            "This URL contains patterns commonly associated with malicious content. Proceed with caution.",
        };
      } else if (!isHttps) {
        result = {
          isSafe: true,
          risk: "medium",
          reason: "URL uses HTTP instead of HTTPS",
          details:
            "This URL is not encrypted. Your data may be visible to others.",
        };
      } else {
        result = {
          isSafe: true,
          risk: "low",
          reason: "URL appears safe",
          details:
            "No obvious security concerns detected. The URL uses HTTPS encryption.",
        };
      }

      setSafetyResult(result);
      if (onCheck) {
        onCheck(result);
      }
    } catch (error) {
      setSafetyResult({
        isSafe: false,
        risk: "unknown",
        reason: "Unable to check URL safety",
        details:
          "An error occurred while checking the URL. Please verify manually.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Automatically check URL safety when scannedUrl changes
  useEffect(() => {
    if (scannedUrl) {
      setSafetyResult(null); // Reset previous result
      checkURLSafety(scannedUrl);
    }
  }, [scannedUrl]);

  const openURL = () => {
    if (scannedUrl) {
      const finalUrl = scannedUrl.startsWith("http")
        ? scannedUrl
        : `https://${scannedUrl}`;
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskIcon = (risk, isSafe) => {
    if (risk === "high" || !isSafe) {
      return <ShieldAlert className="w-5 h-5 text-red-500" />;
    } else if (risk === "medium") {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <ShieldCheck className="w-5 h-5 text-green-500" />;
    }
  };

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Shield className="w-5 h-5" />
          URL Safety Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {scannedUrl && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Scanned URL:
            </p>
            <p className="text-sm text-gray-900 break-all">{scannedUrl}</p>
          </div>
        )}

        {isChecking && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
            <p className="text-gray-600">Checking URL safety...</p>
          </div>
        )}

        {safetyResult && (
          <div className="space-y-4">
            <Alert
              className={`border-l-4 ${
                safetyResult.isSafe
                  ? safetyResult.risk === "medium"
                    ? "border-l-yellow-500 bg-yellow-50"
                    : "border-l-green-500 bg-green-50"
                  : "border-l-red-500 bg-red-50"
              }`}
            >
              <div className="flex items-start gap-2">
                {getRiskIcon(safetyResult.risk, safetyResult.isSafe)}
                <div className="flex-1">
                  <h4
                    className={`font-medium ${getRiskColor(safetyResult.risk)}`}
                  >
                    {safetyResult.reason}
                  </h4>
                  <AlertDescription className="mt-1">
                    {safetyResult.details}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={openURL}
                variant={safetyResult.isSafe ? "default" : "destructive"}
                className="flex-1 min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {safetyResult.isSafe ? "Open URL" : "Open Anyway"}
              </Button>
              <Button
                onClick={() => {
                  setSafetyResult(null);
                  checkURLSafety(scannedUrl);
                }}
                variant="outline"
                className="min-h-[44px]"
              >
                Recheck
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SafetyChecker;