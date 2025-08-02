import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  History,
  Link,
  Calendar,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const ScanHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("qrScanHistory");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <History className="w-5 h-5" />
          Scan History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {history.length === 0 ? (
          <p className="text-gray-500 text-center">
            No scan history yet. Start scanning QR codes!
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {history.map((item, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50"
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanHistory;