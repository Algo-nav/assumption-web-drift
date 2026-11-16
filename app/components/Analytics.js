import GtagLoader from "./GtagLoader";
import InlineScript from "./InlineScript";
import { GA_MEASUREMENT_ID } from "../lib/site";

// GA4 with Google Consent Mode v2, ported from the main site (scndorder-site app/components/Analytics.js).
// The inline script declares the consent default (everything denied but security_storage), restores a saved
// 'granted', and queues the config call. It talks to nobody: it only fills window.dataLayer.
//
// What differs from the main site:
// - gtag.js itself is held back until the visitor accepts (GtagLoader). Loaded under a denied default it
//   still sends a cookieless hit to Google, and the banner says analytics only runs if you accept.
// - this site has a nonce CSP, so both scripts carry the page's nonce. The inline one goes through
//   InlineScript, parsed before anything else on the page; the main site uses next/script's
//   beforeInteractive for the same job.
//
// Renders nothing when GA_MEASUREMENT_ID is empty.

// JSON.stringify so the id can never close the string it sits in.
const BOOT = (id) => `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});
try{if(localStorage.getItem('scnd_consent')==='granted'){gtag('consent','update',{analytics_storage:'granted'})}}catch(e){}
gtag('js',new Date());
gtag('config',${JSON.stringify(id)},{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});`;

export default function Analytics({ nonce }) {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <InlineScript id="consent-default" nonce={nonce} html={BOOT(GA_MEASUREMENT_ID)} />
      <GtagLoader nonce={nonce} />
    </>
  );
}
