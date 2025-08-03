import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Share2, Users, Wifi, WifiOff, Copy, Send } from "lucide-react";

const NearbySharing = ({ contentToShare }) => {
  const [isHost, setIsHost] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageToSend, setMessageToSend] = useState("");

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const websocket = useRef(null);

  // Simple signaling server simulation using localStorage for demo
  // In a real app, you'd use a WebSocket server
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const startHosting = async () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setIsHost(true);
    setConnectionStatus("waiting");

    // Store room info in localStorage for demo
    localStorage.setItem(
      `room_${newRoomId}`,
      JSON.stringify({
        host: true,
        timestamp: Date.now(),
      })
    );

    // Set up peer connection
    setupPeerConnection(true);

    // Simulate checking for connections
    const checkInterval = setInterval(() => {
      const clientInfo = localStorage.getItem(`room_${newRoomId}_client`);
      if (clientInfo) {
        setConnectionStatus("connected");
        setConnectedPeers(["Client"]);
        clearInterval(checkInterval);
      }
    }, 1000);
  };

  const joinRoom = async () => {
    if (!roomId) return;

    const roomInfo = localStorage.getItem(`room_${roomId}`);
    if (!roomInfo) {
      alert("Room not found!");
      return;
    }

    setIsClient(true);
    setConnectionStatus("connecting");

    // Mark as client
    localStorage.setItem(
      `room_${roomId}_client`,
      JSON.stringify({
        timestamp: Date.now(),
      })
    );

    setupPeerConnection(false);
    setConnectionStatus("connected");
    setConnectedPeers(["Host"]);
  };

  const setupPeerConnection = (isHosting) => {
    // This is a simplified WebRTC setup for demo purposes
    // In a real app, you'd need proper STUN/TURN servers and signaling
    setConnectionStatus(isHosting ? "hosting" : "connected");
  };

  const sendMessage = () => {
    if (!messageToSend.trim()) return;

    const message = {
      id: Date.now(),
      text: messageToSend,
      sender: isHost ? "You (Host)" : "You (Client)",
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, message]);

    // Simulate sending to peer
    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        text: `Received: ${messageToSend}`,
        sender: isHost ? "Client" : "Host",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, response]);
    }, 500);

    setMessageToSend("");
  };

  const shareContent = () => {
    if (!contentToShare) return;

    const message = {
      id: Date.now(),
      text: contentToShare,
      sender: "You",
      timestamp: new Date().toLocaleTimeString(),
      isShared: true,
    };

    setMessages((prev) => [...prev, message]);

    // Simulate sharing with peer
    setTimeout(() => {
      const response = {
        id: Date.now() + 1,
        text: "Content received successfully!",
        sender: isHost ? "Client" : "Host",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, response]);
    }, 500);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      alert("Room ID copied to clipboard!");
    });
  };

  const disconnect = () => {
    setIsHost(false);
    setIsClient(false);
    setConnectionStatus("disconnected");
    setConnectedPeers([]);
    setMessages([]);
    setRoomId("");

    // Clean up localStorage
    if (roomId) {
      localStorage.removeItem(`room_${roomId}`);
      localStorage.removeItem(`room_${roomId}_client`);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      case "hosting":
        return "bg-blue-500";
      case "waiting":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "hosting":
        return "Hosting";
      case "waiting":
        return "Waiting for peers";
      default:
        return "Disconnected";
    }
  };

  return (
    <Card className="w-full max-w-full sm:max-w-md md:max-w-lg mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Share2 className="w-5 h-5" />
          <span className="hidden sm:inline">Nearby Sharing</span>
          <span className="sm:hidden">Share</span>
          <Badge className={`ml-auto ${getStatusColor()} text-white text-xs`}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {connectionStatus === "disconnected" && (
          <div className="space-y-4">
            <Alert>
              <Wifi className="w-4 h-4" />
              <AlertDescription>
                Share content with nearby devices using peer-to-peer connection.
                One device should host, others can join using the room ID.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={startHosting} className="flex-1 min-h-[44px]">
                <Users className="w-4 h-4 mr-2" />
                Host Room
              </Button>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Enter Room ID to join"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              />
              <Button
                onClick={joinRoom}
                disabled={!roomId}
                className="w-full min-h-[44px]"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Join Room
              </Button>
            </div>
          </div>
        )}

        {connectionStatus !== "disconnected" && (
          <div className="space-y-4">
            {roomId && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Room ID:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono bg-white px-2 py-1 rounded border">
                    {roomId}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyRoomId}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {connectedPeers.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700 mb-1">
                  Connected: {connectedPeers.join(", ")}
                </p>
              </div>
            )}

            {contentToShare && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Content to share:</p>
                <div className="p-2 bg-blue-50 rounded text-sm break-all">
                  {contentToShare}
                </div>
                <Button onClick={shareContent} className="w-full min-h-[44px]">
                  <Send className="w-4 h-4 mr-2" />
                  Share Content
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageToSend}
                  onChange={(e) => setMessageToSend(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!messageToSend.trim()}
                  className="min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium">Messages:</p>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded text-sm ${
                      msg.sender.includes("You")
                        ? "bg-blue-100 ml-4"
                        : "bg-gray-100 mr-4"
                    } ${msg.isShared ? "border-l-4 border-green-500" : ""}`}
                  >
                    <div className="font-medium text-xs text-gray-600 mb-1">
                      {msg.sender} • {msg.timestamp}
                    </div>
                    <div className="break-all">{msg.text}</div>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={disconnect}
              variant="destructive"
              className="w-full min-h-[44px]"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NearbySharing;