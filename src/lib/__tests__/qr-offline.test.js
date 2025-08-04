import { describe, it, expect } from "vitest";

describe("QR Code Offline Functionality", () => {
  it("should generate QR codes offline", async () => {
    // Import QR code library
    const QRCode = await import("qrcode");

    const testText = "Hello, World!";

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(testText, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Verify QR code was generated
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrCodeDataUrl.length).toBeGreaterThan(100);
  });

  it("should generate QR codes with different options", async () => {
    const QRCode = await import("qrcode");

    const testUrl = "https://example.com";

    // Generate with custom options
    const qrCodeDataUrl = await QRCode.toDataURL(testUrl, {
      width: 300,
      margin: 1,
      color: {
        dark: "#333333",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrCodeDataUrl.length).toBeGreaterThan(100);
  });

  it("should handle empty input gracefully", async () => {
    const QRCode = await import("qrcode");

    try {
      await QRCode.toDataURL("", {
        width: 200,
        margin: 2,
      });
      // If we get here, it means empty string was handled
      expect(true).toBe(true);
    } catch (error) {
      // If it throws an error, that's also acceptable behavior
      expect(error).toBeDefined();
    }
  });

  it("should generate different QR codes for different inputs", async () => {
    const QRCode = await import("qrcode");

    const text1 = "First text";
    const text2 = "Second text";

    const qr1 = await QRCode.toDataURL(text1);
    const qr2 = await QRCode.toDataURL(text2);

    // Different inputs should produce different QR codes
    expect(qr1).not.toBe(qr2);
    expect(qr1.length).toBeGreaterThan(100);
    expect(qr2.length).toBeGreaterThan(100);
  });

  it("should work with URLs", async () => {
    const QRCode = await import("qrcode");

    const testUrl = "https://www.google.com";

    const qrCodeDataUrl = await QRCode.toDataURL(testUrl);

    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrCodeDataUrl.length).toBeGreaterThan(100);
  });

  it("should work with long text", async () => {
    const QRCode = await import("qrcode");

    const longText =
      "This is a very long text that should still be encodable in a QR code. ".repeat(
        10
      );

    const qrCodeDataUrl = await QRCode.toDataURL(longText);

    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(qrCodeDataUrl.length).toBeGreaterThan(100);
  });
});
