"use client";

import Script from "next/script";

export default function AnalyticsScripts() {
  return (
    <>
      {/* Hotjar Script */}
      <Script
        src="https://t.contentsquare.net/uxa/bedb577941075.js"
        strategy="lazyOnload"
        onError={(e) => {
          console.error("Hotjar failed to load:", e);
        }}
        onLoad={() => {
          console.log("Hotjar loaded successfully");
        }}
      />

      {/* Smartlook Script */}
      <Script
        id="smartlook-init"
        strategy="lazyOnload"
        onError={(e) => {
          console.error("Smartlook failed to load:", e);
        }}
        onLoad={() => {
          console.log("Smartlook script loaded, initializing...");
        }}
      >
        {`
          try {
            window.smartlook||(function(d) {
              var o=smartlook=function(){ o.api.push(arguments)},h=d.getElementsByTagName('head')[0];
              var c=d.createElement('script');o.api=new Array();c.async=true;c.type='text/javascript';
              c.charset='utf-8';c.src='https://web-sdk.smartlook.com/recorder.js';h.appendChild(c);
            })(document);
            smartlook('init', '4ad5b6cbf10f919af6767bc19918460094d18594', { region: 'eu' });
            console.log('Smartlook initialized successfully');
          } catch (e) {
            console.error('Smartlook initialization error:', e);
          }
        `}
      </Script>
    </>
  );
}
