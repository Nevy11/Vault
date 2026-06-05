/**
 * Utility to get a human-readable device name from the user agent string.
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let deviceName = "Unknown Device";

  // Check for mobile devices
  if (/android/i.test(ua)) {
    deviceName = "Android Device";
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    deviceName = "iOS Device";
  } else if (/Windows/i.test(ua)) {
    deviceName = "Windows PC";
  } else if (/Macintosh/i.test(ua)) {
    deviceName = "Mac";
  } else if (/Linux/i.test(ua)) {
    deviceName = "Linux PC";
  }

  // Detect Browser
  let browser = "Unknown Browser";
  if (/chrome|crios/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|iceweasel/i.test(ua)) {
    browser = "Firefox";
  } else if (/safari/i.test(ua)) {
    browser = "Safari";
  } else if (/edge/i.test(ua)) {
    browser = "Edge";
  } else if (/opera|opr/i.test(ua)) {
    browser = "Opera";
  }

  return `${browser} on ${deviceName}`;
}

/**
 * Generates a stable pseudo-MAC address for the current device.
 * Since real MAC addresses are not accessible via Web APIs, this uses a combination
 * of local storage and a randomized identifier to simulate a unique hardware ID.
 */
export function getDeviceMacAddress(): string {
  if (typeof window === "undefined") return "00:00:00:00:00:00";

  const STORAGE_KEY = "vault_device_mac";
  let mac = localStorage.getItem(STORAGE_KEY);

  if (!mac) {
    // Generate a pseudo-MAC address (e.g., 00:1A:2B:3C:4D:5E)
    const chars = "0123456789ABCDEF";
    const parts = [];
    for (let i = 0; i < 6; i++) {
      parts.push(chars[Math.floor(Math.random() * 16)] + chars[Math.floor(Math.random() * 16)]);
    }
    mac = parts.join(":");
    localStorage.setItem(STORAGE_KEY, mac);
  }

  return mac;
}
