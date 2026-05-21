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
