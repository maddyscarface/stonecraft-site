import { meta } from "@/lib/seo";
import { PrivacyChoicesLink } from "@/components/Tracking";

export const metadata = meta({ title: "Privacy Policy | StoneCraft", description: "How StoneCraft collects, uses and protects your information.", path: "/privacy" });

export default function Page() {
  return (
    <section className="bg-white py-14"><div className="container-sc prose-sc max-w-3xl">
      <h1 className="font-serif text-4xl">Privacy Policy</h1>
      <p className="rounded bg-linen-pale p-3 text-sm">DRAFT — must be reviewed by counsel before launch (Massachusetts and Florida law, TCPA, CAN-SPAM). Last updated: November 2026.</p>
      <h2>What we collect</h2>
      <ul><li>Information you submit: name, email, phone, ZIP/town, property and project details, photos, and (for renters, only if you authorise it) your landlord's contact details.</li><li>Commercial requests: organisation, role and facility details.</li><li>Technical data: pages viewed, device and browser, referring page, campaign parameters (such as UTM tags and ad click IDs), and cookies.</li></ul>
      <h2>How we use it</h2>
      <ul><li>To respond to your request, assess your surfaces, prepare quotes and schedule work.</li><li>To contact your landlord or property manager, only when you have authorised it.</li><li>To send text messages, only if you opted in. Reply STOP to opt out at any time.</li><li>To measure and improve our website and advertising.</li></ul>
      <h2>Photos</h2>
      <p>Photos you upload are stored securely and seen only by our team and service providers who help us operate. We do not publish photos of your property without your separate written permission.</p>
      <h2>Sharing</h2>
      <p>We share information with service providers that help us run our business (for example CRM, email, SMS, hosting and analytics providers) under contracts that limit their use of it. Advertising platforms (such as Google and Meta) may receive hashed contact information and event data to measure ad performance, subject to your choices below. We do not sell your personal information for money.</p>
      <h2>Your choices</h2>
      <ul><li>Advertising cookies: <PrivacyChoicesLink />. We honour Global Privacy Control signals by turning off advertising cookies.</li><li>Email: unsubscribe using the link in any marketing email.</li><li>Text messages: reply STOP.</li><li>Access or deletion requests: email the address on our contact page.</li></ul>
      <h2>Retention and security</h2>
      <p>We keep information as long as needed to provide services, meet legal obligations and resolve disputes, and we use reasonable safeguards to protect it.</p>
      <h2>Children</h2>
      <p>Our services are not directed to children under 13 and we do not knowingly collect their information.</p>
      <h2>Contact</h2>
      <p>Questions: see our contact page. Operating entity: [VERIFY legal entity name and mailing address].</p>
    </div></section>
  );
}
