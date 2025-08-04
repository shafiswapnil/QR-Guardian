# QR Guardian 🛡️

A comprehensive QR code scanner and generator with built-in safety checking to protect users from malicious links. Born from the concern that QR codes hide their actual destinations from the naked eye, making it impossible to trust them before scanning.

## 🎯 Project Objective

The primary motivation behind QR Guardian was a simple yet critical concern: **QR codes are essentially black boxes**. When you encounter a QR code, you cannot see the actual URL or content it contains without scanning it first. This creates a security dilemma - you need to scan the code to know what it is, but scanning it might expose you to malicious content.

QR Guardian solves this problem by automatically analyzing scanned QR codes and providing safety assessments before you decide to visit the link or interact with the content.

## ✨ Features

### 🔍 **Smart QR Code Scanner**

- **Camera Scanning**: Real-time QR code detection using device camera
- **Image Upload**: Scan QR codes from existing images
- **Multi-format Support**: Handles various QR code formats and content types
- **Mobile Optimized**: Responsive design that works seamlessly on all devices

### 🛡️ **Advanced Safety Checking**

- **Automatic Analysis**: Every scanned QR code is immediately analyzed for safety
- **Multi-layer Detection**:
  - URL validation and format checking
  - Suspicious pattern detection (URL shorteners, IP addresses, random domains)
  - HTTPS encryption verification
  - Malicious keyword scanning
- **Risk Assessment**: Categorizes threats as Low, Medium, or High risk
- **Detailed Reports**: Provides clear explanations of why a URL might be unsafe
- **Visual Indicators**: Color-coded safety status with intuitive icons

### 🎨 **QR Code Generator**

- **Versatile Input**: Generate QR codes from text, URLs, or any content
- **High Quality**: Creates crisp, scannable QR codes
- **Download Support**: Save generated QR codes as PNG images
- **Instant Preview**: Real-time QR code generation

### 📱 **Nearby Sharing** ⚠️ _Demo Only_

> **Note**: This feature is currently a UI prototype and not production-ready. It uses localStorage simulation instead of real peer-to-peer connections.

- **Demo Interface**: Room-based sharing concept with UI mockup
- **Simulated Messaging**: Local-only message simulation for demonstration
- **Future Feature**: Planned for real WebRTC implementation with proper signaling server

### 📊 **Scan History**

- **Complete Log**: Tracks all scanned QR codes with timestamps
- **Safety Status**: Historical record of safety assessments
- **Quick Access**: Easy browsing of previous scans
- **Persistent Storage**: History saved locally on device

## 🔒 How Safety Scanning Works

QR Guardian employs a multi-layered approach to assess URL safety:

### 1. **URL Validation**

- Verifies that scanned content is a valid URL format
- Handles both HTTP and HTTPS protocols
- Catches malformed or suspicious URL structures

### 2. **Pattern Recognition**

The system checks for known suspicious patterns:

- **URL Shorteners**: `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `ow.ly`
- **IP Addresses**: Direct IP access instead of domain names
- **Random Domains**: Suspiciously long random character domains
- **Malicious Keywords**: Terms commonly associated with phishing or malware

### 3. **Security Protocol Analysis**

- **HTTPS Verification**: Checks if the URL uses encrypted connections
- **Certificate Validation**: Ensures secure communication protocols
- **Protocol Warnings**: Alerts users about unencrypted HTTP connections

### 4. **Risk Categorization**

- **🟢 Low Risk**: HTTPS URLs with no suspicious patterns
- **🟡 Medium Risk**: HTTP URLs or minor security concerns
- **🔴 High Risk**: URLs matching suspicious patterns or malicious indicators

### 5. **User Decision Support**

- **Clear Recommendations**: Plain-language explanations of risks
- **Informed Choice**: Users can still proceed after understanding risks
- **Safety First**: Prominent warnings for high-risk content

## 🛠️ Tech Stack

### **Frontend Framework**

- **React 19.1.0**: Modern React with latest features and hooks
- **Vite 6.3.5**: Lightning-fast build tool and development server

### **UI/UX Libraries**

- **Tailwind CSS 4.1.7**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible, unstyled UI components
- **Lucide React**: Beautiful, customizable icons
- **Framer Motion**: Smooth animations and transitions

### **QR Code Technology**

- **html5-qrcode 2.3.8**: Robust QR code scanning from camera and images
- **qrcode 1.5.4**: High-quality QR code generation

### **Additional Features**

- **Local Storage**: Client-side data persistence
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Cross-Platform**: Works seamlessly across desktop and mobile browsers

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/shafiswapnil/QR-Guardian.git
   cd QR-Guardian
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

### Build for Production

```bash
npm run build
npm run preview
```

## 📱 Usage Guide

### Scanning QR Codes

1. Open the **Scanner** tab
2. Choose between **Camera** or **Upload Image**
3. For camera: Click "Start Scanning" and point at QR code
4. For upload: Select an image file containing a QR code
5. The app automatically switches to **Safety** tab for analysis

### Understanding Safety Results

- **🟢 Green**: Safe to proceed - HTTPS with no suspicious patterns
- **🟡 Yellow**: Caution advised - HTTP or minor concerns
- **🔴 Red**: High risk - suspicious patterns detected

### Generating QR Codes

1. Go to **Generator** tab
2. Enter text, URL, or any content
3. Click "Generate QR Code"
4. Download or share the generated code

### Sharing Content ⚠️ _Demo Only_

1. Navigate to **Share** tab
2. Host a room or join with room ID (UI demonstration only)
3. Share scanned content or send messages (simulated locally)
4. **Note**: This feature currently only works as a UI demo - no real device-to-device communication

## 🔐 Privacy & Security

- **Local Processing**: All safety checks performed client-side
- **No Data Collection**: No personal information stored or transmitted
- **Offline Capable**: Core functionality works without internet
- **Demo Features**: Nearby sharing is currently a UI prototype only

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Shafi Swapnil**

- GitHub: [@shafiswapnil](https://github.com/shafiswapnil)

---

**Stay Safe, Scan Smart! 🛡️**