// The visitor's analytics choice, shared by the banner (which sets it) and the gtag.js loader (which waits
// for it). Stored in localStorage under 'scnd_consent' as 'granted' or 'denied'. Browser only.

import { COOKIE_PARENT_DOMAIN, GA_MEASUREMENT_ID } from "./site";

export const STORAGE_KEY = "scnd_consent";

// Hosts a loaded gtag.js sends to. Suffixes, so a regional or renamed endpoint is covered too.
const GOOGLE_HOST = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|doubleclick\.net)$/;

// After a decline, nothing may leave this page for Google. A denied consent state is not enough for that:
// gtag.js queues a hit when the page loads and sends it up to five seconds later, so a visitor who declines
// inside that window would still have the queued page view, client id included, go out. The guard wraps the
// two ways the tag sends (fetch and sendBeacon) and, while analytics is off, drops what is addressed to
// Google. It is installed before gtag.js is requested, so the tag only ever sees the wrapped functions.
// Everything else passes straight through.
let sendingOff = false;
let guarded = false;

function toGoogle(target) {
  try {
    return GOOGLE_HOST.test(new URL(String(target?.url ?? target), location.href).hostname);
  } catch (e) {
    return false;
  }
}

export function installSendGuard() {
  if (guarded || typeof window === "undefined") return;
  guarded = true;
  const { fetch: realFetch } = window;
  window.fetch = function (input, init) {
    if (sendingOff && toGoogle(input)) return Promise.resolve(new Response(null, { status: 204 }));
    return realFetch.call(this, input, init);
  };
  const realBeacon = navigator.sendBeacon;
  if (realBeacon) {
    navigator.sendBeacon = function (url, data) {
      if (sendingOff && toGoogle(url)) return true;
      return realBeacon.call(this, url, data);
    };
  }
}

// _ga and every _ga_<container>; not _gat or _gid, which are other products' cookies.
const GA_COOKIE = /^_ga(_|$)/;

// Expires the analytics cookies on this host and on the parent domain. A cookie can only be removed by naming
// the domain it was set with, which script cannot read, so each name is expired once per candidate: host-only,
// this host as a domain, and the parent domain. The browser ignores the ones that do not apply.
export function deleteAnalyticsCookies() {
  const host = location.hostname;
  const domains = [null, host, `.${host}`, COOKIE_PARENT_DOMAIN];
  const names = document.cookie
    .split(";")
    .map((pair) => pair.split("=")[0].trim())
    .filter((name) => GA_COOKIE.test(name));
  for (const name of new Set(names)) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

// Holds the choice when localStorage is blocked, so choosing still closes the banner.
let memoryChoice = null;

export function applyConsent(value) {
  memoryChoice = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (e) {}
  const granted = value === "granted";
  // Off first, so nothing below and nothing already queued is sent: our guard, then Google's documented off
  // switch for a loaded tag, which stops it creating new hits.
  sendingOff = !granted;
  if (GA_MEASUREMENT_ID) window[`ga-disable-${GA_MEASUREMENT_ID}`] = !granted;
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
    });
  }
  // On a decline, from the banner or from Cookie settings: storage is denied first, so a loaded tag cannot
  // write the cookies back, then the ones already there are removed.
  if (!granted) deleteAnalyticsCookies();
  window.dispatchEvent(new Event("scnd:consent-changed"));
}

export function subscribe(cb) {
  window.addEventListener("scnd:consent-changed", cb);
  window.addEventListener("scnd:open-consent", cb);
  return () => {
    window.removeEventListener("scnd:consent-changed", cb);
    window.removeEventListener("scnd:open-consent", cb);
  };
}

export function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? memoryChoice;
  } catch (e) {
    return memoryChoice;
  }
}

// The server snapshot for useSyncExternalStore: nothing is known until the client has read storage.
export const PENDING = "pending";
export const serverSnapshot = () => PENDING;
