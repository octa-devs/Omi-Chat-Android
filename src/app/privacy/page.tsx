import type { Metadata } from "next";
import { LegalPage, LegalNote } from "@/components/marketing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `What ${SITE.name} collects, who can see it, and how to get it deleted. No advertising, no tracking, no selling your data.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-10-02";

const SECTIONS = [
  {
    id: "who-we-are",
    heading: "Who we are",
    paragraphs: [
      `${SITE.name} (the "Service") is a realtime messaging and calling application built and operated by ${SITE.dev.name} ("we", "us", "our"). This policy explains what personal data we handle, why we handle it, who can see it, and how to make us delete it.`,
      `We are the data controller for the information described here. You can reach us at ${SITE.dev.supportEmail} or via our site at ${SITE.dev.site}.`,
    ],
  },
  {
    id: "the-short-version",
    heading: "The short version",
    paragraphs: [
      "This section is a summary. If it contradicts anything below, the sections below are the policy — but it should not come to that.",
    ],
    bullets: [
      "No advertising. There are no ad networks, no ad identifiers, and no sponsored placements anywhere in the product.",
      "No analytics and no tracking. We run no analytics package, no tracking pixel, and no third-party script that profiles your visit.",
      "We do not sell, rent or trade your data, and we have no business model that would benefit from doing so.",
      "Your email address is used to sign in and is never shown to another user. It is not copied into your profile records.",
      "Your messages and files are readable only by the people in that conversation — including the people you add to it. We do not read them.",
      "Calls connect your browser straight to theirs. Audio and video are never recorded, and never stored by us.",
      "You can block anyone, and you can ask us to delete your account and everything attached to it.",
    ],
  },
  {
    id: "what-we-collect",
    heading: "What we collect",
    paragraphs: [
      "Everything below is either information you type in, or a technical record needed to make the Service work. There is no third list.",
    ],
  },
  {
    id: "account-data",
    heading: "Account data",
    paragraphs: [
      "When you sign up, the Service stores:",
    ],
    bullets: [
      "Your email address, and either a password you choose or the identity supplied by Google when you sign in with it. These are held by our authentication provider. Your password is sent from your browser directly to that provider over an encrypted connection — it never reaches our application servers and we never store it.",
      "A unique @username and a display name, both chosen by you and both visible to other users.",
      "Optionally, a profile photo, a short bio, and a status message.",
      "Your presence state (online, away, busy or offline) and a last-seen timestamp, which update while you are using the app.",
    ],
  },
  {
    id: "what-we-do-not-mirror",
    heading: "We do not copy your email into our own records",
    paragraphs: [
      "It would be simpler for us to denormalise the email address onto your profile row. We deliberately do not. Keeping it in one place inside the authentication provider means there is a single copy to protect, and it means a bug in a profile query cannot leak an address that has no reason to be there.",
      "The practical effect for you: no other user, and no code path in the app, can read your email address.",
    ],
  },
  {
    id: "messages-and-files",
    heading: "Messages and files",
    paragraphs: [
      "The Service stores the substance of your conversations so that you can read them later:",
    ],
    bullets: [
      "Message text, the time it was sent, who sent it, and which conversation it belongs to.",
      "Attachments you upload, up to 50 MB each, held in a private storage bucket that is not publicly accessible.",
      "Edits, reactions, replies, and whether a given message has been read.",
      "Which conversations you have muted or pinned, and who you have blocked.",
    ],
    paragraphs_after: [
      "Some things are deliberately *not* stored. Typing indicators, live microphone and camera state, and the call connection handshake are sent as ephemeral broadcast events to the people in the conversation. They are not written to the database and there is no history to retrieve.",
    ],
  },
  {
    id: "call-records",
    heading: "Call records",
    paragraphs: [
      "So that you have a record of your calls, the Service stores who called whom, when, whether the call was answered or missed, and how long it lasted. It does not store the content of the call.",
    ],
  },
  {
    id: "technical-data",
    heading: "Technical and preference data",
    paragraphs: [
      "The Service stores session cookies, strictly so that you stay signed in between page loads. It also stores your appearance and chat preferences — accent colour, theme, notification choices, and so on. Those preferences live in your profile so they follow you to another device, and in your browser's local storage so the app looks right before your profile has loaded. Nothing about you is sent to anyone to build a picture of your habits.",
    ],
  },
  {
    id: "not-collected",
    heading: "What we do not collect",
    paragraphs: [
      "To be explicit about the things people usually worry about:",
    ],
    bullets: [
      "No advertising or marketing identifiers of any kind.",
      "No behavioural analytics, usage telemetry, session recording, or tracking pixels.",
      "No contacts, photographs, or files from your device, unless you deliberately attach them to a message.",
      "No audio or video recordings. Calls are not recorded by us, and recording one without everyone's consent is not permitted (see the Terms of Service).",
      "No location data. We do not ask for it and we could not use it if we had it.",
    ],
  },
  {
    id: "who-can-see",
    heading: "Who can see your data",
    paragraphs: [
      "Your profile — username, display name, photo, bio, status, and presence — is visible to any signed-in user. That is what makes searching for people and starting a conversation work. Your email address is never visible to anyone.",
      "Your messages, attachments and call history are visible only to the members of the conversation they belong to, which includes anyone you have added to a group. This is enforced in the database rather than in the browser, so it holds even for a tampered client. We can issue support queries against the database, but we do not read your conversations as a matter of course and we do not build any product feature on top of their contents.",
      "Anyone who knows your @username can find you and start a conversation. You can prevent that for a specific person by blocking them in Settings → Privacy & safety; a blocked user cannot message you or call you. We have not built an 'only people I approve can message me' setting, so for now the block list is the tool available.",
    ],
  },
  {
    id: "how-calls-work",
    heading: "How calls work",
    paragraphs: [
      "Calls use WebRTC. Your browser negotiates a connection directly with the other person's browser, and the audio and video travel along it.",
    ],
    bullets: [
      "Omi Chat is currently configured to use public STUN servers only. A STUN server helps two devices find each other; it learns the IP addresses involved for that purpose and does not receive your audio or video.",
      "Connection signalling — the handshake, the ringing, and the control messages that start, accept and end a call — passes through our realtime infrastructure. It contains no audio or video.",
      "If a TURN relay is ever enabled, that relay would carry call media encrypted between the two endpoints. We would update this section and give at least 30 days' notice in the app before making that change.",
    ],
    paragraphs_after: [
      "Call quality depends on your network, and a restrictive corporate or carrier network may prevent a direct connection from being established at all. That is a property of the internet rather than of this app.",
    ],
  },
  {
    id: "processors",
    heading: "Who else processes it",
    paragraphs: [
      "We use a small number of suppliers, and they act on our instructions rather than for their own purposes:",
    ],
    bullets: [
      "Supabase — database, authentication, file storage and realtime messaging. They hold essentially all of the data described above, including your message content. Their own privacy terms apply alongside this policy.",
      "Our email delivery provider — it sends your verification code, your password reset link, and any notice we are required to give you. It necessarily sees your email address.",
      "Google — as the identity provider when you sign in with Google, and as the operator of the public STUN servers used for call setup.",
    ],
    paragraphs_after: [
      "We do not share your data with advertisers, data brokers, or analytics vendors, because we have none.",
      "We will not disclose your data to law enforcement or other authorities unless we are legally required to. Where the law allows and it is appropriate, we will tell you that we have been asked before we hand anything over.",
    ],
  },
  {
    id: "retention",
    heading: "How long we keep it",
    bullets: [
      "Messages, attachments, call history and account records: until you close your account, or until you ask us to delete them.",
      "Presence and last-seen: the current value and its timestamp, overwritten continuously rather than accumulated.",
      "Backups: deleting your account removes you from the live database immediately. Encrypted backups may still contain the data for up to 30 days before they age out.",
      "Records that we are legally obliged to retain for a fixed period, if that ever applies, are kept only for that period.",
    ],
  },
  {
    id: "your-rights",
    heading: "Your rights and controls",
    paragraphs: [
      "You can do the following yourself, without asking us:",
    ],
    bullets: [
      "Block or unblock someone — Settings → Privacy & safety.",
      "Mute or pin a conversation.",
      "Change who sees you as online, whether typing indicators are shown, and whether read receipts are sent — Settings → Chat.",
      "Edit your display name, photo, bio and status.",
      "Sign out, which ends the session on that device.",
    ],
    paragraphs_after: [
      `You can also write to ${SITE.dev.supportEmail} to ask us to give you a copy of your data, correct something inaccurate, delete your account and everything attached to it, or withdraw your consent to something we do.`,
      "We aim to acknowledge within 3 days and to complete within 30. Deletion is irreversible. If you are in the EEA, the UK, or another jurisdiction with comparable protection, you also have the right to complain to your local data protection authority, and to object to or restrict certain processing.",
      "One honest limitation: the app does not yet have a self-serve 'download my data' or 'delete my account' button, so those requests have to go through the email above. We would rather tell you that than bury it.",
    ],
  },
  {
    id: "security",
    heading: "Security",
    paragraphs: [
      "How the Service is built, in the terms that matter for your data:",
    ],
    bullets: [
      "Row Level Security is enabled on every table, and access is granted by membership of the specific chat or call. A query that should return nothing returns nothing even if the request is forged.",
      "Files are held in a private bucket and served only to members of the relevant conversation, through short-lived signed links.",
      "Passwords are hashed by our authentication provider. Sessions are held in HTTP-only cookies that scripts cannot read.",
      "All traffic is encrypted in transit.",
    ],
    paragraphs_after: [
      "No system is perfect, and we do not claim otherwise. If you find a vulnerability, please report it to " +
        SITE.dev.supportEmail +
        " rather than disclosing it publicly, and we will work with you on a fix.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    paragraphs: [
      "Omi Chat is not directed at children under 13, or under 16 in the EEA and the UK, and we do not knowingly collect information from them. If you believe a child has created an account, contact us and we will delete it.",
    ],
  },
  {
    id: "transfers",
    heading: "International transfers",
    paragraphs: [
      "Our suppliers process data in countries other than the one you are in. Where personal data leaves your jurisdiction we rely on the transfer mechanisms those suppliers provide, such as standard contractual clauses. If you need specific information about where your data is processed, ask us and we will tell you.",
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    paragraphs: [
      "If we make a material change, we will announce it in the app and by email to registered addresses before it takes effect. If the change materially reduces your rights we will give you at least 30 days' notice. Continuing to use the Service after a change takes effect means you accept the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro={`How ${SITE.name} handles your data — what we store, who can see it, and how to make us delete it. Written to be read, not to be survived.`}
      updated={UPDATED}
      sections={SECTIONS}
    >
      <LegalNote title="In plain English">
        {[
          <>
            We do not run ads, analytics or tracking. Nothing you do here is
            measured, sold, or shared with anyone for marketing.
          </>,
          <>
            Your password never touches our servers, and your email address is
            never visible to another user.
          </>,
          <>
            Only the people in a conversation can read that conversation. We
            enforce that in the database, not in the browser.
          </>,
          <>
            Calls go directly between browsers. We never record audio or video
            and we never store it.
          </>,
          <>
            You can block anyone, and you can ask us to delete everything. We
            will not make that hard.
          </>,
        ]}
      </LegalNote>
    </LegalPage>
  );
}
