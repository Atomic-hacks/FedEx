import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { TrackingService } from "./services/TrackingService";
import { MessageService } from "./services/MessageService";
import { ShipmentService } from "./services/ShipmentService";
import type {
  Conversation,
  ConversationWithShipment,
  Message,
  Shipment,
  ShipmentDetails,
} from "./types/domain";
import {
  createEventDescription,
  eventStatusLabels,
  type EventStatus,
} from "./utils/eventTemplates";
import "./App.css";

type Page = "home" | "tracking" | "support" | "admin";

const normalizeTrackingNumber = (value: string) => value.trim().toUpperCase();

// Converts an ISO timestamp into the local "YYYY-MM-DDTHH:mm" format
// expected by <input type="datetime-local">, adjusting for timezone offset.
const toLocalInputValue = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

function FedExMark({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`brand ${light ? "brand--light" : ""}`}
      href="/"
      aria-label="FedEx home"
    >
      <span>Fed</span>
      <strong>Ex</strong>
      <small>Express</small>
    </a>
  );
}

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <span className={`arrow ${down ? "arrow--down" : ""}`} aria-hidden="true" />
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [pendingTracking, setPendingTracking] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const go = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onTrack = (event: FormEvent) => {
    event.preventDefault();
    const value = normalizeTrackingNumber(trackingNumber);
    if (value) {
      setVerificationError("");
      setPendingTracking(value);
    }
  };

  const verifyTracking = async (email: string) => {
    if (!pendingTracking) return;
    setIsVerifying(true);
    setVerificationError("");
    try {
      const valid = await TrackingService.verifyEmail(pendingTracking, email);
      if (!valid) {
        setVerificationError(
          "The provided email does not match this shipment.",
        );
        return;
      }
      sessionStorage.setItem(`tracking-access:${pendingTracking}`, "verified");
      setPendingTracking(null);
      go(`/tracking/${pendingTracking}`);
    } catch {
      setVerificationError("Unable to verify this shipment right now.");
    } finally {
      setIsVerifying(false);
    }
  };

  const page: Page = path.startsWith("/tracking/")
    ? "tracking"
    : path.startsWith("/support/")
      ? "support"
      : path.startsWith("/admin")
        ? "admin"
        : "home";
  const routeTrackingNumber = useMemo(
    () => decodeURIComponent(path.split("/")[2] || ""),
    [path],
  );

  if (page === "tracking")
    return (
      <TrackingPage
        key={routeTrackingNumber}
        trackingNumber={routeTrackingNumber}
        onBack={() => go("/")}
        onSupport={() => go(`/support/${routeTrackingNumber}`)}
      />
    );
  if (page === "support")
    return (
      <SupportPage
        trackingNumber={routeTrackingNumber}
        onBack={() => go(`/tracking/${routeTrackingNumber}`)}
      />
    );
  if (page === "admin") return <AdminPage onExit={() => go("/")} />;

  return (
    <HomePage
      trackingNumber={trackingNumber}
      onChange={setTrackingNumber}
      onTrack={onTrack}
      pendingTracking={pendingTracking}
      onCancelVerify={() => setPendingTracking(null)}
      onVerify={verifyTracking}
      verificationError={verificationError}
      isVerifying={isVerifying}
    />
  );
}

function HomePage({
  trackingNumber,
  onChange,
  onTrack,
  pendingTracking,
  onCancelVerify,
  onVerify,
  verificationError,
  isVerifying,
}: {
  trackingNumber: string;
  onChange: (value: string) => void;
  onTrack: (event: FormEvent) => void;
  pendingTracking: string | null;
  onCancelVerify: () => void;
  onVerify: (email: string) => void;
  verificationError: string;
  isVerifying: boolean;
}) {
  return (
    <div className="site-shell">
      <header className="main-header">
        <div className="header-inner">
          <FedExMark light />
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#shipping">
              Shipping <Arrow down />
            </a>
            <a href="#tracking">
              Tracking <Arrow down />
            </a>
            <a href="#design">
              Design &amp; Print <Arrow down />
            </a>
            <a href="#locations">Locations</a>
          </nav>
          <div className="header-actions">
            <button className="search-icon" aria-label="Search">
              <i />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" id="tracking">
          <div className="hero-lines" />
          <div className="hero-content">
            <h1>Ship, manage, track, deliver.</h1>
            <p>
              Every package has a journey. We help you stay connected to it.
            </p>
            <form className="tracking-card" onSubmit={onTrack}>
              <label htmlFor="tracking">Track your package</label>
              <div className="tracking-row">
                <input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder="Enter tracking number"
                  autoComplete="off"
                />
                <button type="submit">
                  Track <Arrow />
                </button>
              </div>
              <button type="button" className="multi-track">
                TRACK MULTIPLE SHIPMENTS <span>›</span>
              </button>
            </form>
          </div>
          <div className="package-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="package-box">
              <span>FEDEX</span>
              <b>EXPRESS</b>
              <i />
            </div>
            <div className="package-shadow" />
          </div>
        </section>

        <section className="quick-actions" aria-label="Shipping options">
          <a href="#shipping">
            <span className="action-icon box-icon" />
            <b>Ship a package</b>
            <small>Get rates and create a shipment</small>
            <Arrow />
          </a>
          <a href="#pickup">
            <span className="action-icon pin-icon" />
            <b>Find a location</b>
            <small>Drop off, pick up, or get help</small>
            <Arrow />
          </a>
          <a href="#account">
            <span className="action-icon user-icon" />
            <b>Manage your account</b>
            <small>Access your shipping tools</small>
            <Arrow />
          </a>
        </section>

        <section className="feature-section" id="shipping">
          <div className="feature-copy">
            <p className="eyebrow">DELIVERING POSSIBILITY</p>
            <h2>Made for the moments that matter.</h2>
            <p>
              From the things you need to the things you love, we put more care
              into every delivery.
            </p>
            <a className="text-link" href="#learn">
              Explore shipping services <Arrow />
            </a>
          </div>
          <div className="feature-art">
            <img src="/fed4.webp" alt="FedEx delivery service" />
            <div className="art-label">
              <span>FAST</span>
              <b>ON THE WAY</b>
            </div>
          </div>
        </section>

        <section className="news-section">
          <p className="eyebrow">FEDEX UPDATES</p>
          <h2>Tools to keep your business moving.</h2>
          <div className="news-grid">
            <article>
              <img src="/fed1.webp" alt="Business shipping solutions" />
              <p>BUSINESS SOLUTIONS</p>
              <h3>Smarter shipping starts here.</h3>
              <a href="#solutions">
                Discover solutions <Arrow />
              </a>
            </article>
            <article>
              <img src="/fed2.webp" alt="Delivery options for a parcel" />
              <p>DELIVERY OPTIONS</p>
              <h3>More ways to get your package.</h3>
              <a href="#delivery">
                See delivery options <Arrow />
              </a>
            </article>
            <article>
              <img src="/fed4.webp" alt="Small business delivery service" />
              <p>SMALL BUSINESS</p>
              <h3>Big support for small businesses.</h3>
              <a href="#business">
                Get started <Arrow />
              </a>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer">
        <FedExMark light />
        <div>
          <a href="#support">Customer Support</a>
          <a href="#terms">Terms of Use</a>
          <a href="#privacy">Privacy</a>
        </div>
        <small>© 2026 FedEx. Designed for shipment tracking.</small>
      </footer>
      {pendingTracking && (
        <div className="verify-overlay" role="dialog" aria-modal="true">
          <form
            className="verify-modal"
            onSubmit={(event) => {
              event.preventDefault();
              onVerify(String(new FormData(event.currentTarget).get("email")));
            }}
          >
            <button
              type="button"
              className="close-modal"
              onClick={onCancelVerify}
            >
              ×
            </button>
            <p className="eyebrow">VERIFY SHIPMENT</p>
            <h2>Confirm your email</h2>
            <p>
              Enter the email address used for shipment <b>{pendingTracking}</b>{" "}
              to view its details.
            </p>
            <label>
              Email address
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                autoFocus
              />
            </label>
            {verificationError && (
              <small className="form-error">{verificationError}</small>
            )}
            <button className="purple-button" disabled={isVerifying}>
              {isVerifying ? "Verifying…" : "View shipment"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function TrackingPage({
  trackingNumber,
  onBack,
  onSupport,
}: {
  trackingNumber: string;
  onBack: () => void;
  onSupport: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [shipment, setShipment] = useState<ShipmentDetails | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    TrackingService.getShipment(trackingNumber)
      .then((result) => {
        if (!cancelled) setShipment(result);
      })
      .catch(() => {
        if (!cancelled) setLookupFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    const refresh = window.setInterval(() => {
      TrackingService.getShipment(trackingNumber)
        .then((result) => {
          if (!cancelled) setShipment(result);
        })
        .catch(() => undefined);
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [trackingNumber]);
  return (
    <div className="tracking-page">
      <header className="sub-header">
        <FedExMark />
        <button onClick={onBack}>‹ Back to home</button>
        <a href="#help">Help</a>
      </header>
      <main className="tracking-main">
        <p className="breadcrumb">
          TRACKING <span>/</span> PACKAGE DETAILS
        </p>
        <div className="tracking-title-row">
          <div>
            <h1>Track your shipment</h1>
            <p>
              Tracking number <b>{trackingNumber || "—"}</b>
            </p>
          </div>
          <button className="outline-button" onClick={onBack}>
            Track another package
          </button>
        </div>
        {isLoading ? (
          <div className="loading-state">
            <i />
            <span>Finding your shipment…</span>
          </div>
        ) : shipment ? (
          <ShipmentCard shipment={shipment} onSupport={onSupport} />
        ) : (
          <NotFoundCard
            trackingNumber={trackingNumber}
            onSupport={onSupport}
            setupError={lookupFailed}
          />
        )}
      </main>
      <footer className="simple-footer">
        © 2026 FedEx. All rights reserved.
      </footer>
    </div>
  );
}

function ShipmentCard({
  shipment,
  onSupport,
}: {
  shipment: ShipmentDetails;
  onSupport: () => void;
}) {
  const events = [...shipment.tracking_events].sort(
    (a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
  const formatted = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";
  const updates = events;
  return (
    <div className="shipment-details">
      <section className="shipment-summary">
        <div>
          <p className="status-label">CURRENT STATUS</p>
          <h2>{shipment.status.replaceAll("_", " ")}</h2>
          <p className="location-label">
            {shipment.current_location || "Location will update when available"}
          </p>
        </div>
        <div className="delivery-date">
          <span>ESTIMATED DELIVERY</span>
          <b>{formatted(shipment.estimated_delivery)}</b>
        </div>
      </section>
      <section className="shipment-info">
        <div>
          <span>FROM</span>
          <b>
            {shipment.origin_city}, {shipment.origin_country}
          </b>
        </div>
        <div>
          <span>TO</span>
          <b>
            {shipment.destination_city}, {shipment.destination_country}
          </b>
        </div>
        <div>
          <span>SHIP DATE</span>
          <b>{formatted(shipment.ship_date)}</b>
        </div>
        <div>
          <span>EXPECTED DELIVERY</span>
          <b>{formatted(shipment.expected_delivery_date)}</b>
        </div>
        <div>
          <span>PACKAGE TYPE</span>
          <b>{shipment.shipment_type}</b>
        </div>
        <div>
          <span>WEIGHT</span>
          <b>{shipment.weight ? `${shipment.weight} kg` : "—"}</b>
        </div>
        <div>
          <span>CARRIER</span>
          <b>{shipment.carrier || "—"}</b>
        </div>
        <div>
          <span>REFERENCE</span>
          <b>{shipment.reference_number || "—"}</b>
        </div>
        <div>
          <span>LAST UPDATED</span>
          <b>{formatted(shipment.updated_at)}</b>
        </div>
      </section>
      {shipment.shipment_items.length > 0 && (
        <section className="items-section">
          <h2>Shipment items</h2>
          {shipment.shipment_items.map((item) => (
            <div key={item.id}>
              <b>{item.name}</b>
              <span>Quantity: {item.quantity}</span>
            </div>
          ))}
        </section>
      )}
      {shipment.notes && (
        <section className="shipment-notes">
          <span>NOTES</span>
          <p>{shipment.notes}</p>
        </section>
      )}
      <section className="timeline-section">
        <div className="timeline-heading">
          <div>
            <h2>Shipment travel history</h2>
            <p>Latest updates from your shipment.</p>
          </div>
          <button className="plain-button" onClick={onSupport}>
            Get support <Arrow />
          </button>
        </div>
        {updates.length ? (
          <ol className="timeline">
            {updates.map((event, index) => (
              <li
                className={index === 0 ? "timeline-current" : ""}
                key={event.id}
              >
                <i>✓</i>
                <div>
                  <small>{formatted(event.occurred_at)}</small>
                  <b>{event.title}</b>
                  <p>{event.description}</p>
                  <em>
                    {event.city}, {event.country}
                  </em>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-timeline">
            Updates will appear here as your shipment moves.
          </p>
        )}
      </section>
    </div>
  );
}

function NotFoundCard({
  trackingNumber,
  onSupport,
  setupError,
}: {
  trackingNumber: string;
  onSupport: () => void;
  setupError: boolean;
}) {
  const message = setupError ? (
    "We can’t reach the tracking service right now. Please try again shortly."
  ) : (
    <>
      We couldn’t find a shipment with{" "}
      <b>{trackingNumber || "this tracking number"}</b>. Check the number and
      try again, or contact support if you need help.
    </>
  );
  return (
    <section className="not-found-card">
      <div className="not-found-icon">?</div>
      <div>
        <h2>
          {setupError
            ? "Tracking is temporarily unavailable."
            : "Tracking number not found."}
        </h2>
        <p>{message}</p>
        <div className="not-found-actions">
          <button
            className="purple-button"
            onClick={() => window.history.back()}
          >
            Try another number
          </button>
          <button className="plain-button" onClick={onSupport}>
            Contact support <Arrow />
          </button>
        </div>
      </div>
    </section>
  );
}

function SupportThread({ messages }: { messages: Message[] }) {
  const threadRef = useRef<HTMLDivElement>(null);
  const replyCount = messages.filter(
    (message) => message.sender_type === "admin",
  ).length;
  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);
  return (
    <section className="support-conversation" aria-live="polite">
      <header>
        <div>
          <span>SECURE CONVERSATION</span>
          <h2>Your messages</h2>
        </div>
        {replyCount > 0 && (
          <b>
            {replyCount} support {replyCount === 1 ? "reply" : "replies"}
          </b>
        )}
      </header>
      {messages.length ? (
        <div
          className="support-thread"
          ref={threadRef}
          role="log"
          aria-label="Support conversation"
        >
          {messages.map((message) => (
            <article
              className={
                message.sender_type === "admin" ? "support-thread-admin" : ""
              }
              key={message.id}
            >
              <small>
                {message.sender_type === "admin" ? "Support team" : "You"} ·{" "}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(message.created_at))}
              </small>
              <p>{message.body}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="support-awaiting">
          Your conversation is being opened. Support replies will appear here
          automatically.
        </p>
      )}
    </section>
  );
}

function SupportPage({
  trackingNumber,
  onBack,
}: {
  trackingNumber: string;
  onBack: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const queryToken = new URLSearchParams(window.location.search).get("token");
  const [token, setToken] = useState<string | null>(
    () =>
      queryToken ?? sessionStorage.getItem(`support-token:${trackingNumber}`),
  );
  const [publicConversation, setPublicConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [copyState, setCopyState] = useState("");
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const loadConversation = async () => {
      try {
        const conversation = await MessageService.getPublicConversation(
          trackingNumber,
          token,
        );
        if (!conversation) throw new Error("Invalid support link");
        if (!cancelled) {
          setPublicConversation(conversation);
          setSent(false);
        }
        const records = await MessageService.listPublicMessages(
          trackingNumber,
          token,
        );
        if (!cancelled) setMessages(records);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error && reason.message !== "Invalid support link"
              ? "We could not retrieve this conversation right now. Please refresh and try again."
              : "This secure support link is invalid or has expired.",
          );
      }
    };
    const refreshMessages = () =>
      MessageService.listPublicMessages(trackingNumber, token)
        .then((records) => {
          if (!cancelled) setMessages(records);
        })
        .catch(() => undefined);
    loadConversation();
    const refresh = window.setInterval(refreshMessages, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [trackingNumber, token]);
  const copyConversationLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("Secure link copied.");
    } catch {
      setCopyState("Copy this page address to keep your conversation link.");
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    setIsSending(true);
    setError("");
    try {
      if (token && publicConversation) {
        const message = await MessageService.sendPublicMessage(
          trackingNumber,
          token,
          String(values.get("message")),
        );
        setMessages((current) => [...current, message]);
        formElement.reset();
      } else {
        const conversation = await MessageService.startPublicConversation(
          trackingNumber,
          String(values.get("name")),
          String(values.get("email")),
          String(values.get("message")),
        );
        sessionStorage.setItem(
          `support-token:${trackingNumber}`,
          conversation.public_token,
        );
        setToken(conversation.public_token);
        window.history.replaceState(
          {},
          "",
          `/support/${trackingNumber}?token=${conversation.public_token}`,
        );
        setSent(true);
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Message could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  };
  return (
    <div className="tracking-page">
      <header className="sub-header">
        <FedExMark />
        <button onClick={onBack}>‹ Back to tracking</button>
        <a href="#help">Help</a>
      </header>
      <main className="support-main">
        <p className="breadcrumb">
          SUPPORT <span>/</span> {trackingNumber}
        </p>
        <h1>How can we help?</h1>
        <p className="support-intro">
          Send a message about your shipment. We’ll show replies from our
          support team in this secure conversation.
        </p>
        <section className="support-card">
          {token && <SupportThread messages={messages} />}
          <form onSubmit={submit}>
            <div className="support-shipment">
              <span>Shipment</span>
              <b>{trackingNumber}</b>
            </div>
            {!token && (
              <div className="form-two">
                <label>
                  Name
                  <input name="name" required placeholder="Your full name" />
                </label>
                <label>
                  Email
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
            )}
            {token && publicConversation && (
              <div className="support-returning">
                <span>
                  Welcome back, {publicConversation.visitor_name}. Replies
                  refresh automatically.
                </span>
                <button type="button" onClick={copyConversationLink}>
                  Copy secure conversation link
                </button>
                {copyState && <small>{copyState}</small>}
              </div>
            )}
            {sent && (
              <p className="support-sent">
                Your message was sent. This page will update when support
                replies.
              </p>
            )}
            <label>
              {token ? "Send another message" : "How can we help?"}
              <textarea
                name="message"
                required
                placeholder="Tell us what you need help with"
                rows={5}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button
              className="purple-button"
              type="submit"
              disabled={isSending || (!!token && !publicConversation)}
            >
              {isSending ? (
                "Sending…"
              ) : (
                <>
                  Send message <Arrow />
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function AdminSidebar({
  active,
  onExit,
}: {
  active: "dashboard" | "shipments" | "messages" | "email" | "settings";
  onExit: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <>
      {!isOpen && (
        <button
          className="admin-mobile-menu"
          type="button"
          aria-expanded="false"
          aria-controls="admin-navigation"
          onClick={() => setIsOpen(true)}
        >
          <span aria-hidden="true">☰</span>Menu
        </button>
      )}
      {isOpen && (
        <button
          className="admin-menu-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={close}
        />
      )}
      <aside
        id="admin-navigation"
        className={`admin-sidebar ${isOpen ? "admin-sidebar--open" : ""}`}
      >
        <FedExMark light />
        <button
          className="admin-menu-close"
          type="button"
          onClick={close}
          aria-label="Close navigation"
        >
          ×
        </button>
        <p className="admin-label">ADMIN PORTAL</p>
        <a
          href="/admin/dashboard"
          className={active === "dashboard" ? "active" : ""}
          onClick={close}
        >
          <span>▦</span> Dashboard
        </a>
        <a
          href="/admin/shipments"
          className={active === "shipments" ? "active" : ""}
          onClick={close}
        >
          <span>□</span> Shipments
        </a>
        <a
          href="/admin/messages"
          className={active === "messages" ? "active" : ""}
          onClick={close}
        >
          <span>◌</span> Messages
        </a>
        <a href="/admin/shipments/new" onClick={close}>
          <span>＋</span> Create shipment
        </a>
        <button className="admin-exit" onClick={onExit}>
          ← Exit portal
        </button>
      </aside>
    </>
  );
}

function ShipmentsPage({ onExit }: { onExit: () => void }) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    ShipmentService.list()
      .then((data) => {
        if (!cancelled) setShipments(data);
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load shipments.",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);
  const load = () => {
    setIsLoading(true);
    setReloadToken((token) => token + 1);
  };
  const save = async (shipment: Shipment, form: HTMLFormElement) => {
    const values = new FormData(form);
    const shipDateRaw = String(values.get("shipDate") || "").trim();
    const expectedRaw = String(values.get("expectedDelivery") || "").trim();
    const shipISO = shipDateRaw ? new Date(shipDateRaw).toISOString() : null;
    const expectedISO = expectedRaw
      ? new Date(expectedRaw).toISOString()
      : null;
    if (shipISO && expectedISO && new Date(expectedISO) <= new Date(shipISO)) {
      throw new Error("Expected delivery must be after ship date.");
    }
    await ShipmentService.update(shipment.id, {
      tracking_number: normalizeTrackingNumber(
        String(values.get("trackingNumber")),
      ),
      status: String(values.get("status")) as ShipmentDetails["status"],
      ship_date: shipISO,
      expected_delivery_date: expectedISO,
    });
    load();
  };
  return (
    <div className="admin-page">
      <AdminSidebar active="shipments" onExit={onExit} />
      <main>
        <header className="admin-header">
          <div>
            <p>SHIPMENT MANAGEMENT</p>
            <h1>Shipments</h1>
          </div>
          <a className="purple-button" href="/admin/shipments/new">
            + Create shipment
          </a>
        </header>
        <section className="admin-panel shipment-list-panel">
          <div className="panel-heading">
            <div>
              <h2>All shipments</h2>
              <p>
                Open a shipment to post a visible tracking update or compose its
                email.
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="empty-dashboard">
              <p>Loading shipments…</p>
            </div>
          ) : error ? (
            <div className="empty-dashboard">
              <p className="form-error">{error}</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="empty-dashboard">
              <div>□</div>
              <h3>No shipments yet</h3>
              <a className="outline-button" href="/admin/shipments/new">
                Create shipment
              </a>
            </div>
          ) : (
            <div className="shipment-list">
              {shipments.map((shipment) => (
                <form
                  key={shipment.id}
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(shipment, event.currentTarget).catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Update failed.",
                      ),
                    );
                  }}
                >
                  <div>
                    <span>CUSTOMER</span>
                    <b>{shipment.customer_name || "—"}</b>
                    <small>{shipment.customer_email}</small>
                  </div>
                  <label>
                    <span>TRACKING NUMBER</span>
                    <input
                      name="trackingNumber"
                      defaultValue={shipment.tracking_number}
                    />
                  </label>
                  <label>
                    <span>STATUS</span>
                    <select name="status" defaultValue={shipment.status}>
                      <option value="created">Created</option>
                      <option value="picked_up">Picked up</option>
                      <option value="in_transit">In transit</option>
                      <option value="at_facility">At facility</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </label>
                  <label>
                    <span>SHIP DATE</span>
                    <input
                      name="shipDate"
                      type="datetime-local"
                      defaultValue={toLocalInputValue(shipment.ship_date)}
                    />
                  </label>
                  <label>
                    <span>EXPECTED DELIVERY</span>
                    <input
                      name="expectedDelivery"
                      type="datetime-local"
                      defaultValue={toLocalInputValue(
                        shipment.expected_delivery_date,
                      )}
                    />
                  </label>
                  <div className="shipment-list-actions">
                    <button className="outline-button">Save</button>
                    <a
                      className="plain-button"
                      href={`/admin/shipments/${encodeURIComponent(shipment.tracking_number)}`}
                    >
                      Manage <Arrow />
                    </a>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MessagesPage({ onExit }: { onExit: () => void }) {
  const [conversations, setConversations] = useState<
    ConversationWithShipment[]
  >([]);
  const [selected, setSelected] = useState<ConversationWithShipment | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const loadConversations = () =>
    MessageService.listConversations()
      .then(setConversations)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load conversations.",
        ),
      );
  useEffect(() => {
    loadConversations();
    const refresh = window.setInterval(loadConversations, 15000);
    return () => window.clearInterval(refresh);
  }, []);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const refreshMessages = () =>
      MessageService.listMessages(selected.id)
        .then((records) => {
          if (!cancelled) setMessages(records);
        })
        .catch(() => undefined);
    const refresh = window.setInterval(refreshMessages, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [selected?.id]);
  const open = async (conversation: ConversationWithShipment) => {
    setSelected(conversation);
    setError("");
    try {
      const records = await MessageService.listMessages(conversation.id);
      setMessages(records);
      await MessageService.markRead(conversation.id);
      loadConversations();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load messages.",
      );
    }
  };
  const reply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const formElement = event.currentTarget;
    const body = String(new FormData(formElement).get("reply")).trim();
    if (!body) return;
    setIsSending(true);
    setError("");
    try {
      const message = await MessageService.send(selected.id, body, "admin");
      setMessages((current) => [...current, message]);
      formElement.reset();
      loadConversations();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Reply could not be sent.",
      );
    } finally {
      setIsSending(false);
    }
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <div className="admin-page">
      <AdminSidebar active="messages" onExit={onExit} />
      <main>
        <header className="admin-header">
          <div>
            <p>CUSTOMER SUPPORT</p>
            <h1>Messages</h1>
          </div>
        </header>
        <section
          className={`admin-panel inbox-panel ${selected ? "inbox-panel--conversation-open" : ""}`}
        >
          {error && <p className="form-error inbox-error">{error}</p>}
          <div className="conversation-list">
            {conversations.length ? (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={selected?.id === conversation.id ? "active" : ""}
                  onClick={() => open(conversation)}
                >
                  <span>
                    {conversation.admin_unread_count > 0 ? "NEW" : "SUPPORT"}
                  </span>
                  <b>{conversation.visitor_name}</b>
                  <small>
                    {conversation.shipments?.tracking_number || "Shipment"} ·{" "}
                    {date(conversation.last_message_at)}
                  </small>
                </button>
              ))
            ) : (
              <p>No customer conversations yet.</p>
            )}
          </div>
          <div className="conversation-thread">
            {selected ? (
              <>
                <header>
                  <button
                    type="button"
                    className="mobile-conversation-back"
                    onClick={() => {
                      setSelected(null);
                      setMessages([]);
                    }}
                  >
                    ‹ All conversations
                  </button>
                  <div>
                    <span>
                      {selected.shipments?.tracking_number || "SHIPMENT"}
                    </span>
                    <h2>{selected.visitor_name}</h2>
                    <p>{selected.visitor_email}</p>
                  </div>
                </header>
                <div
                  className="message-thread"
                  role="log"
                  aria-label={`Conversation with ${selected.visitor_name}`}
                >
                  {messages.map((message) => (
                    <article
                      className={
                        message.sender_type === "admin"
                          ? "message-admin"
                          : "message-customer"
                      }
                      key={message.id}
                    >
                      <span>
                        {message.sender_type === "admin"
                          ? "Support team"
                          : selected.visitor_name}{" "}
                        · {date(message.created_at)}
                      </span>
                      <p>{message.body}</p>
                    </article>
                  ))}
                </div>
                <form onSubmit={reply}>
                  <textarea
                    name="reply"
                    required
                    rows={4}
                    placeholder="Write a reply to the customer"
                  />
                  <button className="purple-button" disabled={isSending}>
                    {isSending ? "Sending…" : "Send reply"}
                  </button>
                </form>
              </>
            ) : (
              <div className="empty-dashboard">
                <div>◌</div>
                <h3>Select a conversation</h3>
                <p>Customer support messages will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function CreateShipmentPage({ onExit }: { onExit: () => void }) {
  const [trackingNumber, setTrackingNumber] = useState(() =>
    TrackingService.generateNumber(),
  );
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [eventStatus, setEventStatus] =
    useState<EventStatus>("shipment_created");
  const createShipment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const [originCity, originCountry = ""] = String(form.get("origin"))
      .split(",")
      .map((part) => part.trim());
    const [destinationCity, destinationCountry = ""] = String(
      form.get("destination"),
    )
      .split(",")
      .map((part) => part.trim());
    // Validate ship/expected delivery dates and prepare ISO values
    const shipDateRaw = String(form.get("shipDate") || "").trim();
    const expectedRaw = String(form.get("expectedDelivery") || "").trim();
    const eventDate = String(form.get("eventDate") || "").trim();
    if (!eventDate) {
      setMessage("Select the date and time for the first tracking update.");
      setSaving(false);
      return;
    }
    const shipISO = shipDateRaw ? new Date(shipDateRaw).toISOString() : null;
    const expectedISO = expectedRaw
      ? new Date(expectedRaw).toISOString()
      : null;
    if (shipISO && expectedISO && new Date(expectedISO) <= new Date(shipISO)) {
      setMessage("Expected delivery must be after ship date.");
      setSaving(false);
      return;
    }

    try {
      const shipment = await ShipmentService.create({
        tracking_number: trackingNumber,
        customer_name: String(form.get("customerName")),
        customer_email: String(form.get("customerEmail")).toLowerCase(),
        status: String(form.get("status")) as ShipmentDetails["status"],
        current_location: originCity || null,
        estimated_delivery: String(form.get("estimatedDelivery")) || null,
        ship_date: shipISO,
        expected_delivery_date: expectedISO,
        origin_city: originCity,
        origin_country: originCountry,
        destination_city: destinationCity,
        destination_country: destinationCountry,
        shipment_type: String(form.get("shipmentType")),
        carrier: String(form.get("carrier")) || null,
        reference_number: String(form.get("referenceNumber")) || null,
        notes: String(form.get("notes")) || null,
        weight: Number(form.get("weight")) || null,
        proof_image_url: null,
        is_archived: false,
      });
      const items = String(form.get("items"))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, quantity = "1"] = line.split("|");
          return {
            shipment_id: shipment.id,
            name: name.trim(),
            quantity: Math.max(1, Number(quantity) || 1),
          };
        });
      await ShipmentService.addItems(items);
      const timeline = String(form.get("timeline"))
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await Promise.all(
        timeline.map((title) =>
          ShipmentService.addEvent({
            shipment_id: shipment.id,
            title,
            description: null,
            city: originCity,
            country: originCountry,
            occurred_at: eventDate
              ? new Date(eventDate).toISOString()
              : eventDate,
          }),
        ),
      );
      const eventCity = String(form.get("eventCity")) || originCity;
      const eventCountry = String(form.get("eventCountry")) || originCountry;
      await ShipmentService.addEvent({
        shipment_id: shipment.id,
        title: eventStatusLabels[eventStatus],
        description: createEventDescription(
          eventStatus,
          eventCity,
          eventCountry,
          String(form.get("facility")),
          String(form.get("eventNote")),
        ),
        city: eventCity,
        country: eventCountry,
        occurred_at: eventDate ? new Date(eventDate).toISOString() : eventDate,
      });
      setMessage(`Shipment ${shipment.tracking_number} created successfully.`);
      formElement.reset();
      setTrackingNumber(TrackingService.generateNumber());
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Shipment could not be created.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="admin-page">
      <AdminSidebar active="shipments" onExit={onExit} />
      <main>
        <header className="admin-header">
          <div>
            <p>SHIPMENT MANAGEMENT</p>
            <h1>Create shipment</h1>
          </div>
        </header>
        <section className="admin-panel shipment-form-panel">
          <div className="panel-heading">
            <div>
              <h2>Shipment details</h2>
              <p>Create a tracking record with its first timeline event.</p>
            </div>
          </div>
          <form className="shipment-form" onSubmit={createShipment}>
            <div className="form-grid">
              <label>
                Customer name
                <input name="customerName" required />
              </label>
              <label>
                Customer email
                <input name="customerEmail" type="email" required />
              </label>
              <label>
                Tracking number
                <div className="tracking-admin-input">
                  <input
                    value={trackingNumber}
                    onChange={(e) =>
                      setTrackingNumber(normalizeTrackingNumber(e.target.value))
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTrackingNumber(TrackingService.generateNumber())
                    }
                  >
                    Generate
                  </button>
                </div>
              </label>
              <label>
                Current status
                <select name="status" defaultValue="created">
                  <option value="created">Shipment created</option>
                  <option value="picked_up">Package picked up</option>
                  <option value="in_transit">In transit</option>
                  <option value="at_facility">Arrived at facility</option>
                  <option value="out_for_delivery">Out for delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
              <label>
                Origin <small>City, Country</small>
                <input name="origin" required placeholder="Lagos, Nigeria" />
              </label>
              <label>
                Destination <small>City, Country</small>
                <input
                  name="destination"
                  required
                  placeholder="London, United Kingdom"
                />
              </label>
              <label>
                Estimated delivery date
                <input name="estimatedDelivery" type="datetime-local" />
              </label>
              <label>
                Ship date
                <input name="shipDate" type="datetime-local" />
              </label>
              <label>
                Expected delivery date
                <input name="expectedDelivery" type="datetime-local" />
              </label>
              <label>
                Weight (kg)
                <input name="weight" type="number" min="0" step="0.01" />
              </label>
              <label>
                Shipment type
                <input name="shipmentType" required placeholder="Express" />
              </label>
              <label>
                Carrier
                <input name="carrier" placeholder="FedEx" />
              </label>
              <label>
                Reference number
                <input name="referenceNumber" />
              </label>
              <label>
                First update type
                <select
                  value={eventStatus}
                  onChange={(event) =>
                    setEventStatus(event.target.value as EventStatus)
                  }
                >
                  {Object.entries(eventStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Update location <small>City</small>
                <input name="eventCity" placeholder="Defaults to origin" />
              </label>
              <label>
                Update country
                <input name="eventCountry" placeholder="Defaults to origin" />
              </label>
              <label>
                Facility (optional)
                <input name="facility" />
              </label>
              <label>
                Update time
                <input name="eventDate" type="datetime-local" required />
              </label>
            </div>
            <label>
              Items <small>One per line: Item name | quantity</small>
              <textarea
                name="items"
                rows={4}
                placeholder={'MacBook Pro 16" | 1\nUSB-C Charger | 2'}
              />
            </label>
            <label>
              Additional timeline entries{" "}
              <small>One event title per line</small>
              <textarea name="timeline" rows={3} />
            </label>
            <label>
              First update note{" "}
              <small>Overrides the automatic description</small>
              <textarea name="eventNote" rows={3} />
            </label>
            <label>
              Internal shipment notes
              <textarea name="notes" rows={3} />
            </label>
            {message && <p className="form-message">{message}</p>}
            <button className="purple-button" disabled={saving}>
              {saving ? "Creating…" : "Create shipment"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function ShipmentWorkspace({
  trackingNumber,
  onExit,
}: {
  trackingNumber: string;
  onExit: () => void;
}) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>("in_transit");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const load = () =>
    ShipmentService.adminByTrackingNumber(trackingNumber)
      .then(setShipment)
      .catch((reason) =>
        setMessage(
          reason instanceof Error ? reason.message : "Could not load shipment.",
        ),
      );
  useEffect(() => {
    load();
  }, [trackingNumber]);
  const postUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shipment) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const city =
      String(form.get("city")).trim() ||
      shipment.current_location ||
      shipment.origin_city;
    const country =
      String(form.get("country")).trim() || shipment.origin_country;

    const shipDateRaw = String(form.get("shipDate") || "").trim();
    const expectedRaw = String(form.get("expectedDelivery") || "").trim();
    const shipISO = shipDateRaw
      ? new Date(shipDateRaw).toISOString()
      : shipment.ship_date;
    const expectedISO = expectedRaw
      ? new Date(expectedRaw).toISOString()
      : shipment.expected_delivery_date;
    const eventDateRaw = String(form.get("eventDate") || "").trim();
    if (!eventDateRaw) {
      setMessage("Select the date and time for this tracking update.");
      return;
    }
    const eventDateISO = new Date(eventDateRaw).toISOString();
    if (shipISO && expectedISO && new Date(expectedISO) <= new Date(shipISO)) {
      setMessage("Expected delivery must be after ship date.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      await ShipmentService.addEvent({
        shipment_id: shipment.id,
        title: eventStatusLabels[eventStatus],
        description: createEventDescription(
          eventStatus,
          city,
          country,
          String(form.get("facility")),
          String(form.get("note")),
        ),
        city,
        country,
        occurred_at: eventDateISO,
      });
      await ShipmentService.update(shipment.id, {
        status: String(form.get("status")) as ShipmentDetails["status"],
        current_location: city,
        ship_date: shipISO,
        expected_delivery_date: expectedISO,
      });
      setMessage(
        "Visible tracking update published. It will appear on this shipment’s public timeline.",
      );
      formElement.reset();
      load();
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "The update could not be published.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="admin-page">
      <AdminSidebar active="shipments" onExit={onExit} />
      <main>
        <header className="admin-header">
          <div>
            <p>SHIPMENT MANAGEMENT</p>
            <h1>Shipment workspace</h1>
          </div>
          <a className="outline-button" href="/admin/shipments">
            All shipments
          </a>
        </header>
        {!shipment ? (
          <section className="admin-panel">
            <div className="empty-dashboard">
              <p>{message || "Loading shipment…"}</p>
            </div>
          </section>
        ) : (
          <>
            <section className="admin-panel workspace-summary">
              <div>
                <span>TRACKING NUMBER</span>
                <h2>{shipment.tracking_number}</h2>
                <p>
                  {shipment.customer_name || "Customer"} ·{" "}
                  {shipment.customer_email || "No email address"}
                </p>
              </div>
              <div>
                <span>CURRENT STATUS</span>
                <b>{shipment.status.replaceAll("_", " ")}</b>
                <p>{shipment.current_location || "Location not set"}</p>
              </div>
            </section>
            <section className="admin-panel shipment-form-panel">
              <div className="panel-heading">
                <div>
                  <h2>Publish tracking update</h2>
                  <p>This creates a visible entry on this order’s timeline.</p>
                </div>
              </div>
              <form
                key={shipment.updated_at}
                className="shipment-form"
                onSubmit={postUpdate}
              >
                <label>
                  Update type
                  <select
                    value={eventStatus}
                    onChange={(event) =>
                      setEventStatus(event.target.value as EventStatus)
                    }
                  >
                    {Object.entries(eventStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Set shipment status
                    <select name="status" defaultValue={shipment.status}>
                      <option value="created">Created</option>
                      <option value="picked_up">Picked up</option>
                      <option value="in_transit">In transit</option>
                      <option value="at_facility">At facility</option>
                      <option value="out_for_delivery">Out for delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="delayed">Delayed</option>
                      <option value="exception">Exception</option>
                    </select>
                  </label>
                  <label>
                    City
                    <input
                      name="city"
                      defaultValue={shipment.current_location || ""}
                      placeholder={shipment.origin_city}
                    />
                  </label>
                  <label>
                    Country
                    <input
                      name="country"
                      defaultValue={shipment.origin_country}
                    />
                  </label>
                  <label>
                    Facility
                    <input name="facility" placeholder="Optional" />
                  </label>
                  <label>
                    Update time
                    <input name="eventDate" type="datetime-local" required />
                  </label>
                  <label>
                    Ship date
                    <input
                      name="shipDate"
                      type="datetime-local"
                      defaultValue={toLocalInputValue(shipment.ship_date)}
                    />
                  </label>
                  <label>
                    Expected delivery date
                    <input
                      name="expectedDelivery"
                      type="datetime-local"
                      defaultValue={toLocalInputValue(
                        shipment.expected_delivery_date,
                      )}
                    />
                  </label>
                </div>
                <label>
                  Update note{" "}
                  <small>Optional; replaces the automatic detail text.</small>
                  <textarea
                    name="note"
                    rows={4}
                    placeholder="Describe the update for the customer"
                  />
                </label>
                <button className="purple-button" disabled={isSaving}>
                  {isSaving ? "Publishing…" : "Publish visible update"}
                </button>
              </form>
            </section>
            {message && (
              <p className="form-message workspace-message">{message}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function DashboardPage({ onExit }: { onExit: () => void }) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [conversations, setConversations] = useState<
    ConversationWithShipment[]
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([ShipmentService.list(), MessageService.listConversations()])
      .then(([shipmentRecords, conversationRecords]) => {
        setShipments(shipmentRecords);
        setConversations(conversationRecords);
      })
      .catch(() => setError("Dashboard data could not be loaded."));
  }, []);
  const activeShipments = shipments.filter(
    (shipment) => !["delivered", "exception"].includes(shipment.status),
  ).length;
  const attentionShipments = shipments.filter((shipment) =>
    ["delayed", "exception"].includes(shipment.status),
  ).length;
  const unreadMessages = conversations.reduce(
    (total, conversation) => total + conversation.admin_unread_count,
    0,
  );
  const recentShipments = [...shipments]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 5);
  return (
    <div className="admin-page">
      <AdminSidebar active="dashboard" onExit={onExit} />
      <main>
        <header className="admin-header">
          <div>
            <p>ADMIN PORTAL</p>
            <h1>Shipment dashboard</h1>
          </div>
          <a className="purple-button" href="/admin/shipments/new">
            + Create shipment
          </a>
        </header>
        {error && <p className="form-error dashboard-error">{error}</p>}
        <section className="metric-grid dashboard-metrics">
          <div>
            <span>ACTIVE SHIPMENTS</span>
            <b>{activeShipments}</b>
            <small>Currently in progress</small>
          </div>
          <div>
            <span>NEEDS ATTENTION</span>
            <b>{attentionShipments}</b>
            <small>Delayed or exception shipments</small>
          </div>
          <div>
            <span>UNREAD MESSAGES</span>
            <b>{unreadMessages}</b>
            <small>Customer support requests</small>
          </div>
        </section>
        <section className="admin-panel dashboard-recent">
          <div className="panel-heading">
            <div>
              <h2>Recent shipments</h2>
              <p>
                Open a shipment to publish a customer-visible tracking update.
              </p>
            </div>
            <a className="plain-button" href="/admin/shipments">
              View all <Arrow />
            </a>
          </div>
          {recentShipments.length ? (
            <div className="dashboard-shipment-list">
              {recentShipments.map((shipment) => (
                <a
                  href={`/admin/shipments/${encodeURIComponent(shipment.tracking_number)}`}
                  key={shipment.id}
                >
                  <div>
                    <span>{shipment.tracking_number}</span>
                    <b>{shipment.customer_name || "Customer"}</b>
                  </div>
                  <em className={`status-pill status-pill--${shipment.status}`}>
                    {shipment.status.replaceAll("_", " ")}
                  </em>
                  <Arrow />
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-dashboard">
              <div>□</div>
              <h3>No shipments yet</h3>
              <p>Create your first shipment to start tracking deliveries.</p>
              <a className="outline-button" href="/admin/shipments/new">
                Create shipment
              </a>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminPage({ onExit }: { onExit: () => void }) {
  const route = window.location.pathname.replace(/^\/admin\/?/, "");
  if (route === "shipments") return <ShipmentsPage onExit={onExit} />;
  if (route === "shipments/new") return <CreateShipmentPage onExit={onExit} />;
  if (route === "messages") return <MessagesPage onExit={onExit} />;
  if (route.startsWith("shipments/"))
    return (
      <ShipmentWorkspace
        trackingNumber={decodeURIComponent(route.slice("shipments/".length))}
        onExit={onExit}
      />
    );
  return <DashboardPage onExit={onExit} />;
}

export default App;
