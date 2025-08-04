import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  CameraOff,
  Upload,
  Image,
  Video,
  Zap,
  ZoomIn,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Pro-mode state
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [capabilities, setCapabilities] = useState(null);

  const getCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        setCameras(devices);
        const rearCamera =
          devices.find((device) => /back|rear/i.test(device.label)) ||
          devices[0];
        setSelectedCameraId(rearCamera.id);
        setPermissionError(null);
      }
    } catch (err) {
      console.error("Error getting cameras:", err);
      setPermissionError(
        "Unable to access camera. Please grant permission and ensure it's available."
      );
    }
  }, []);

  useEffect(() => {
    getCameras();
  }, [getCameras]);

  const startScanning = async () => {
    if (!selectedCameraId) {
      setPermissionError("No camera selected.");
      return;
    }

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
      if (onScanSuccess) {
        onScanSuccess(decodedText, decodedResult);
      }
      stopScanning();
    };

    const qrCodeErrorCallback = (error) => {
      if (onScanError) {
        onScanError(error);
      }
    };

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode("qr-reader", {
        verbose: false,
        logger: {
          log: () => {},
          warn: () => {},
          error: () => {},
        },
      });
    }

    try {
      await html5QrCodeRef.current.start(
        selectedCameraId,
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      );
      setIsScanning(true);

      // Get capabilities after starting
      const stream = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
      setCapabilities(stream);
      // Reset controls to default
      setTorchOn(false);
      setZoom(stream?.zoom?.min || 1);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setPermissionError(`Failed to start scanner: ${err.message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = useCallback(() => {
    if (html5QrCodeRef.current && isScanning) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          setIsScanning(false);
          setCapabilities(null);
        })
        .catch((err) => {
          console.error("Error stopping scanner:", err);
        });
    }
  }, [isScanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  const handleCameraChange = (value) => {
    if (isScanning) {
      stopScanning();
    }
    setSelectedCameraId(value);
  };

  const handleTorchChange = async (checked) => {
    if (isScanning && capabilities?.torch) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          torch: checked,
          advanced: [{ torch: checked }],
        });
        setTorchOn(checked);
      } catch (err) {
        console.error("Error toggling torch:", err);
      }
    }
  };

  const handleZoomChange = async (value) => {
    if (isScanning && capabilities?.zoom) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({
          zoom: value[0],
          advanced: [{ zoom: value[0] }],
        });
        setZoom(value[0]);
      } catch (err) {
        console.error("Error setting zoom:", err);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadError(null);

    try {
      // Use a temporary Html5Qrcode instance for file scanning
      const fileScanner = new Html5Qrcode("file-scan-result", false);
      const result = await fileScanner.scanFile(file, true);

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
              onClick={stopScanning}
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
              <span className="sm:hidden">Cam</span>
            </TabsTrigger>
            <TabsTrigger
              value="upload"
              className="flex items-center gap-2 min-h-[40px] text-sm"
              onClick={stopScanning}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Image</span>
              <span className="sm:hidden">Upload</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            <div
              id="qr-reader"
              className="w-full [&_video]:aspect-square [&_video]:object-cover rounded-lg overflow-hidden"
            ></div>

            {permissionError && (
              <div className="text-red-500 text-sm text-center">
                {permissionError}
              </div>
            )}

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                {!isScanning ? (
                  <Button
                    onClick={startScanning}
                    className="flex-1 w-full min-h-[44px]"
                    disabled={!selectedCameraId}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button
                    onClick={stopScanning}
                    variant="destructive"
                    className="flex-1 w-full min-h-[44px]"
                  >
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Scanning
                  </Button>
                )}
                <Select
                  onValueChange={handleCameraChange}
                  defaultValue={selectedCameraId}
                  disabled={isScanning}
                >
                  <SelectTrigger className="w-full sm:w-auto sm:flex-grow-[2] min-h-[44px]">
                    <SelectValue placeholder="Select a camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="torch-mode"
                    checked={torchOn}
                    onCheckedChange={handleTorchChange}
                    disabled={!isScanning || !capabilities?.torch}
                  />
                  <Label
                    htmlFor="torch-mode"
                    className="flex items-center gap-2 text-sm"
                  >
                    <Zap
                      className={`w-4 h-4 ${
                        !isScanning || !capabilities?.torch
                          ? "text-muted-foreground"
                          : ""
                      }`}
                    />
                    Torch
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label
                    htmlFor="zoom-slider"
                    className="flex items-center gap-2 text-sm"
                  >
                    <ZoomIn
                      className={`w-4 h-4 ${
                        !isScanning || !capabilities?.zoom
                          ? "text-muted-foreground"
                          : ""
                      }`}
                    />
                  </Label>
                  <Slider
                    id="zoom-slider"
                    value={[zoom]}
                    onValueChange={handleZoomChange}
                    min={capabilities?.zoom?.min || 1}
                    max={capabilities?.zoom?.max || 1}
                    step={capabilities?.zoom?.step || 0.1}
                    disabled={!isScanning || !capabilities?.zoom}
                    className="flex-1"
                  />
                </div>
              </div>
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