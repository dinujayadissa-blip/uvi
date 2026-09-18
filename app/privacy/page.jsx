import Link from 'next/link';

export const metadata = {
  title: 'Privacy, Terms & Cookies',
  description: 'Privacy policy, terms of use, and cookie notice for Uvi.',
  robots: { index: false }
};

export default function PrivacyPage() {
  return (
    <div className="wrap legal-wrap">
      <Link href="/" className="back-home">&larr; Back to Uvi</Link>
      <h1>Privacy, Terms &amp; Cookies</h1>
      <p className="updated">Last updated: 18 September 2026</p>

      <div className="disclaimer">
        <strong>Please note:</strong> Uvi is an early-stage project. It does not yet operate as a
        full commercial service, take payments, or send marketing. The policies below describe how the
        live service handles your information and are provided in good faith as it grows.
      </div>

      <h2 id="privacy">Privacy Policy</h2>
      <p>We collect only the information you choose to give us. If you join the &quot;notify me&quot; list, that
        is your email address, used solely to let you know when new features launch. If you create an
        account, we also store the details you provide — email, username, display name and any optional
        profile information such as your home state or rig, plus content you post such as trips,
        reviews and photos. Authentication and this data are handled by our backend provider, Supabase,
        on our behalf. Trip tools such as the fuel calculator and packing checklist run entirely in your
        browser; that data is stored locally on your device and is never sent to us.</p>
      <p>We never sell your personal data. You can request access to, correction of, or deletion of
        your data at any time. We retain your details only as long as needed to provide the service.</p>
      <p>Where applicable we comply with the Australian Privacy Principles, and with the GDPR and CCPA
        for visitors covered by them, including honouring data-subject rights.</p>

      <h2 id="terms">Terms of Use</h2>
      <p>Uvi is provided for general information. Content such as trip routes, track conditions, and
        travel tips is general guidance and may not reflect current conditions, closures, prices, or
        entry requirements. Always confirm details with official sources — weather bureaus, state fire
        services, roads authorities, and national park websites — before you travel.</p>
      <p>We make no warranty as to the accuracy or completeness of the content and accept no liability
        for decisions made based on it. The outdoors carries real risks; travel prepared and within
        your ability.</p>

      <h2 id="cookies">Cookie Notice</h2>
      <p>Uvi does not set tracking or advertising cookies. We use your browser&apos;s local storage to
        remember your packing checklist and to keep you signed in on your own device. If we add
        analytics in future, we will tell you clearly and ask for consent where required.</p>

      <h2 id="contact">Contact</h2>
      <p>Questions about these policies? As Uvi grows we will publish a monitored contact address here.</p>
    </div>
  );
}
