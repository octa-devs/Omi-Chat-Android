import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The rules for using ${SITE.name} - what is expected of you, what you keep ownership of, and how the Service is provided.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-10-02";

/**
 * Bracketed all-caps markers below are deliberate and must be resolved before
 * this document goes live. They stand in for facts only the operator can
 * supply - governing law, jurisdiction, registered address. Shipping with one
 * left in is worse than omitting the clause, because a clause with an unfilled
 * blank is unenforceable and reads as though nobody checked.
 */
const SECTIONS = [
  {
    id: "agreement",
    heading: "1. The agreement",
    paragraphs: [
      `These Terms of Service ("Terms") are the agreement between you and ${SITE.dev.name} ("we", "us") for your use of ${SITE.name} (the "Service"). They apply alongside our Privacy Policy, which describes how we handle your data.`,
      "By creating an account you accept these Terms. If you do not accept them, do not use the Service - and if you are agreeing on behalf of an organisation, you confirm that you have authority to bind it.",
    ],
  },
  {
    id: "the-service",
    heading: "2. The service",
    paragraphs: [
      `${SITE.name} is a realtime messaging application with group conversations, text and file sharing, and peer-to-peer voice and video calling. Accounts are free. We may add, change or withdraw features; where a change materially reduces what you relied on, we will announce it in the app rather than removing it quietly.`,
    ],
  },
  {
    id: "eligibility",
    heading: "3. Eligibility",
    paragraphs: [
      "You must be at least 13 years old (16 in the EEA and the UK), legally able to enter into this agreement, and not barred from receiving the Service under the law of your country. One account per person. Do not share an account, and do not let anyone else use your sign-in.",
    ],
  },
  {
    id: "your-account",
    heading: "4. Your account and security",
    paragraphs: [
      "You are responsible for your password and for everything done through your account. Choose a password you do not use anywhere else. Sign out on shared or public devices - the app does not need you to remember to lock it, but a saved session on someone else's machine is still a saved session.",
      "Tell us promptly at " +
        SITE.dev.supportEmail +
        " if you think someone else has access to your account.",
    ],
  },
  {
    id: "acceptable-use",
    heading: "5. Acceptable use",
    paragraphs: ["You agree not to use the Service to:"],
    bullets: [
      "Harass, threaten, stalk, defame, or otherwise abuse anyone.",
      "Send unsolicited bulk messages, spam, or bulk promotional content.",
      "Impersonate anyone, or misrepresent who you are or who you are speaking for.",
      "Distribute illegal content, or content that infringes someone else's copyright, trademark, privacy or other rights.",
      "Break the law where you are, or help others break it.",
      "Interfere with the Service or its infrastructure: scraping, bulk automated messaging, probing or testing the security of accounts other than your own, denial-of-service attacks, or reverse engineering in order to reach another person's data.",
      "Distribute malware, or send content intended to compromise someone else's device.",
      "Record a call or a conversation without the consent of everyone taking part.",
      "Work around a block - by impersonating the person who set it, or by any other means.",
    ],
  },
  {
    id: "moderation",
    heading: "6. Blocking, reporting and removal",
    paragraphs: [
      "You can block someone in Settings -> Privacy & safety. A blocked user cannot message you or call you. Unblocking restores that ability; it does not restore anything you deleted in the meantime.",
      `If someone is breaking these Terms, email ${SITE.dev.supportEmail} with their @username and what happened. We will look at it. We may remove content, restrict an account, or close an account that breaches these Terms, or where we are legally required to act. Where it is lawful and appropriate to do so, we will tell you why and give you a chance to put it right first.`,
      "We do not read private conversations as routine practice, and we do not need to in order to act on most reports.",
    ],
  },
  {
    id: "your-content",
    heading: "7. Your content",
    paragraphs: [
      "Your messages, files, and the content of your calls remain yours. We claim no ownership of them.",
      "To do the thing you signed up for, you give us a limited licence to host, copy, transmit, display and back up that content - strictly to the extent needed to deliver it to you and to the other people in the conversation, and to keep your history available to you. That licence ends when you delete the content or close your account. It does not let us use your messages for anything else.",
      "You are responsible for what you send, and you confirm that you have the right to share it. If you photograph someone, sending it to them is usually fine; sending it to a stranger is a different act, and it is yours.",
    ],
  },
  {
    id: "calls",
    heading: "8. Calls",
    paragraphs: [
      "Calls are peer-to-peer: your browser connects to theirs. Availability and quality depend on your network, and a restrictive corporate or carrier network can prevent a call connecting at all. A relay may be used to establish calls that would otherwise fail.",
      "We work to keep calls reliable but we cannot promise they will never drop, and we do not offer a guaranteed quality of service. Recording a call without the consent of everyone on it is prohibited, and we will close accounts that do it.",
    ],
  },
  {
    id: "third-parties",
    heading: "9. Third-party services",
    paragraphs: [
      "The Service depends on Supabase for infrastructure, and on Google for sign-in with Google and for call connection setup. Those services are provided under their own terms and we do not control them. If one of them is unavailable or changes, parts of the Service may stop working, and we are not responsible for their terms or their conduct.",
    ],
  },
  {
    id: "free-tier",
    heading: "10. Free-tier infrastructure",
    paragraphs: [
      "The Service currently runs on free-tier infrastructure, which is subject to fair use and to suspension for inactivity. We aim to keep it free. If that changes we will say so well in advance, rather than reducing what you already rely on without notice.",
    ],
  },
  {
    id: "availability",
    heading: "11. Availability and changes",
    paragraphs: [
      "We aim to keep the Service running, but we do not guarantee that it will be available without interruption. Features may change, be deprecated, or be withdrawn. We are not liable for indirect or consequential loss arising from unavailability.",
    ],
  },
  {
    id: "termination",
    heading: "12. Suspension and termination",
    paragraphs: [
      `You may close your account at any time by emailing ${SITE.dev.supportEmail} from the address on the account. We will confirm once it is done.`,
      "We may suspend or close an account that breaches these Terms, or where we are legally required to. Where we are able to, we will tell you why and give you an opportunity to resolve the issue. Where a serious risk to other users or to the Service requires immediate action, we may act first and explain afterwards.",
      "Closing an account deletes your messages, files and call history, along with your profile and your @username. Your @username may then be claimed by someone else.",
    ],
  },
  {
    id: "disclaimers",
    heading: "13. Disclaimer of warranties",
    paragraphs: [
      'The Service is provided "as is" and "as available", without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be error-free or uninterrupted, or that any message, file or call will be delivered without loss or delay.',
    ],
  },
  {
    id: "liability",
    heading: "14. Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, exemplary or consequential damages, or for loss of profits, revenue, data, goodwill or anticipated savings, however arising and however caused.",
      "Nothing in these Terms excludes or limits liability that cannot lawfully be excluded, including liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot be limited by law.",
    ],
  },
  {
    id: "indemnity",
    heading: "15. Indemnity",
    paragraphs: [
      "You agree to indemnify and hold harmless " +
        SITE.dev.name +
        " and its people from any claim, demand, loss or expense (including reasonable legal fees) arising from your use of the Service, your content, your breach of these Terms, or your violation of anyone else's rights.",
    ],
  },
  {
    id: "changes",
    heading: "16. Changes to these Terms",
    paragraphs: [
      "We may update these Terms. We will announce material changes in the app and by email to registered addresses at least 14 days before they take effect. If a change materially reduces your rights we will give you at least 30 days' notice. Continuing to use the Service after a change takes effect means you accept it. If you do not accept the updated Terms, close your account before they take effect.",
    ],
  },
  {
    id: "governing-law",
    heading: "17. Governing law and disputes",
    paragraphs: [
      "TODO: These Terms are governed by the laws of [INSERT GOVERNING LAW], without regard to its conflict-of-laws rules.",
      "TODO: The courts of [INSERT JURISDICTION] have exclusive jurisdiction over any dispute arising from these Terms, except that consumers keep any right to bring proceedings in the place where they live. Before litigation, please write to us - most disputes are a misunderstanding and are far quicker to resolve by email.",
    ],
  },
  {
    id: "contact",
    heading: "18. Contact and operator details",
    paragraphs: [
      `${SITE.dev.name} operates the Service. TODO: Complete the operator's registered or contact address before publication - several jurisdictions require a postal address in consumer-facing terms.`,
    ],
    bullets: [
      `Email - ${SITE.dev.supportEmail}`,
      `Website - ${SITE.dev.site}`,
      `Instagram - ${SITE.dev.instagramHandle}`,
      "Registered address - TODO: INSERT REGISTERED ADDRESS",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      intro={`The agreement between you and ${SITE.dev.name} for using ${SITE.name}. Plain language, no surprises - including the parts that limit what we can promise.`}
      updated={UPDATED}
      sections={SECTIONS}
    />
  );
}