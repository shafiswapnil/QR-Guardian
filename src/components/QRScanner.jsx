import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, CameraOff, Upload, Image } from "lucide-react";

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop the stream immediately after getting permission
      setPermissionGranted(true);
      setPermissionError(null);
      return true;
    } catch (err) {
      console.error("Camera permission denied or error:", err);
      setPermissionGranted(false);
      setPermissionError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please grant permission in your browser settings."
          : "Unable to access camera. Please ensure it's available and not in use by another application."
      );
      return false;
    }
  };

  const startScanning = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      return;
    }

    if (scanner) {
      scanner.clear();
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText, decodedResult) => {
        console.log(`QR Code detected: ${decodedText}`);
        if (onScanSuccess) {
          onScanSuccess(decodedText, decodedResult);
        }
        // Stop scanning after successful scan
        html5QrcodeScanner.clear();
        setIsScanning(false);
      },
      (error) => {
        // Handle scan error silently (too many errors for failed attempts)
        if (
          onScanError &&
          error !==
            "QR code parse error, error = NotFoundException: No MultiFormat Readers were able to detect the code."
        ) {
          console.warn(`QR Code scan error: ${error}`);
        }
      }
    );

    setScanner(html5QrcodeScanner);
    setIsScanning(true);
  };

  const stopScanning = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);

    try {
      const html5QrCode = new Html5Qrcode("file-scan-result");
      const result = await html5QrCode.scanFile(file, true);

      console.log(`QR Code detected from file: ${result}`);
      if (onScanSuccess) {
        onScanSuccess(result);
      }
    } catch (error) {
      console.error("Error scanning file:", error);
      setUploadError(
        "No QR code found in the uploaded image. Please try another image."
      );
      if (onScanError) {
        onScanError(error);
      }
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Camera className="w-5 h-5" />
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger
              value="camera"
              className="flex items-center gap-2 min-h-[40px] text-sm"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
              <span className="sm:hidden">Cam</span>
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center gap-2 min-h-[40px] text-sm"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Image</span>
              <span className="sm:hidden">Upload</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <div id="qr-reader" className="w-full"></div>

            {permissionError && (
              <div className="text-red-500 text-sm text-center">
                {permissionError}
              </div>
            )}

            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startScanning} className="flex-1 min-h-[44px]">
                  <Camera className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Start Scanning</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                  className="flex-1 min-h-[44px]"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Stop Scanning</span>
                  <span className="sm:hidden">Stop</span>
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="text-center py-8">
              <Image className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                Upload an image containing a QR code
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                onClick={triggerFileUpload}
                disabled={isProcessingFile}
                className="w-full min-h-[44px]"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessingFile ? "Processing..." : "Choose Image"}
              </Button>
            </div>

            {uploadError && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">
                {uploadError}
              </div>
            )}

            <div id="file-scan-result" className="hidden"></div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QRScanner;