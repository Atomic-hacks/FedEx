import { useState } from "react";
import "./App.css";

const trackingNumber = "FDX107519783692";

const shipmentItems = [
  ["Luxury Watch", "1"],
  ["Letter", "1"],
  ["Jewelry (Chains, Bracelet, Earrings and Rings)", "1"],
  ["Cheque", "1"],
];

const travelHistory = [
  [
    "Sep 3, 2026, 3:25 PM",
    "Customs Hold",
    "Shipment is pending customs clearance at our Sydney, Australia facility. Please await an email with further instructions or contact support for assistance.",
    "Sydney, Australia",
  ],
  [
    "Sep 2, 2026, 2:20 PM",
    "Customs Hold",
    "The shipment is awaiting customs review in Australia.",
    "Sydney, Australia",
  ],
  [
    "Aug 31, 2026, 7:15 AM",
    "Arrived at Facility",
    "The shipment has arrived at the distribution center [Sydney, Australia].",
    "Sydney, Australia",
  ],
  [
    "Aug 30, 2026, 9:05 AM",
    "Departed Facility",
    "The shipment departed from the sorting facility [Los Angeles, CA] and is currently in transit.",
    "Carlifonia, USA",
  ],
  [
    "Aug 26, 2026, 1:12 PM",
    "Arrived at Facility",
    "The shipment has arrived at the distribution center [Los Angeles, CA].",
    "Carlifonia, USA",
  ],
  [
    "Aug 26, 2026, 10:06 AM",
    "Package Picked Up",
    "The shipment was collected by the courier in Carlifonia, USA.",
    "Carlifonia, USA",
  ],
  [
    "Aug 24, 2026, 12:54 PM",
    "Shipment Created",
    "Shipping information was received in Carlifonia, USA.",
    "Carlifonia, USA",
  ],
];

function ExpressMark({ light = false }: { light?: boolean }) {
  return (
    <a
      className={`brand ${light ? "brand--light" : ""}`}
      href="/"
      aria-label="Westline home"
    >
      <span>West</span>
      <strong>line</strong>
      <small>Logistics</small>
    </a>
  );
}

function Arrow() {
  return <span className="arrow" aria-hidden="true" />;
}

function App() {
  const [showTracking, setShowTracking] = useState(false);

  if (showTracking) {
    return <TrackingPage onBack={() => setShowTracking(false)} />;
  }

  return <HomePage onTrack={() => setShowTracking(true)} />;
}

function HomePage({ onTrack }: { onTrack: () => void }) {
  const [value, setValue] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (value.trim().toUpperCase() === trackingNumber) onTrack();
  };

  return (
    <div className="site-shell">
      <header className="main-header">
        <div className="header-inner">
          <ExpressMark light />
          <nav className="main-nav" aria-label="Primary navigation">
            <a href="#shipping">Shipping</a>
            <a href="#tracking">Tracking</a>
            <a href="#locations">Locations</a>
          </nav>
          <button className="search-icon" aria-label="Search">
            <i />
          </button>
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
            <form className="tracking-card" onSubmit={submit}>
              <label htmlFor="tracking-number">Track your package</label>
              <div className="tracking-row">
                <input
                  id="tracking-number"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Enter tracking number"
                  autoComplete="off"
                />
                <button type="submit">
                  Track <Arrow />
                </button>
              </div>
              <span className="multi-track">
                TRACK MULTIPLE SHIPMENTS <span>›</span>
              </span>
            </form>
          </div>
          <div className="package-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="package-box">
              <span>Westline</span>
              <b>Transit</b>
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
          <a href="#locations">
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
      </main>
      <footer className="footer">
        <ExpressMark />
        <small>© 2026 Westline. Designed for shipment tracking.</small>
      </footer>
    </div>
  );
}

function TrackingPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="tracking-page">
      <header className="sub-header">
        <ExpressMark />
        <button onClick={onBack}>‹ Back to home</button>
        <a href="#support">Help</a>
      </header>
      <main className="tracking-main">
        <p className="breadcrumb">
          TRACKING <span>/</span> PACKAGE DETAILS
        </p>
        <div className="tracking-title-row">
          <div>
            <h1>Track your shipment</h1>
            <p>
              Tracking number <b>{trackingNumber}</b>
            </p>
          </div>
          <button className="outline-button" onClick={onBack}>
            Track another package
          </button>
        </div>
        <div className="shipment-details">
          <section className="shipment-summary">
            <div>
              <p className="status-label">CURRENT STATUS</p>
              <h2>delayed</h2>
              <p className="location-label">Sydney</p>
            </div>
            <div className="delivery-date">
              <span>ESTIMATED DELIVERY</span>
              <b>Sep 5, 2026, 3:00 AM</b>
            </div>
          </section>
          <section className="shipment-info">
            <Info label="FROM" value="Carlifonia, USA" />
            <Info label="TO" value="Western Australia, Australia" />
            <Info label="SHIP DATE" value="Aug 24, 2026, 5:45 PM" />
            <Info label="EXPECTED DELIVERY" value="Sep 7, 2026, 10:00 AM" />
            <Info label="PACKAGE TYPE" value="Standard" />
            <Info label="WEIGHT" value="2.2 kg" />
            <Info label="CARRIER" value="FedEx" />
            <Info label="REFERENCE" value="212566291" />
            <Info label="LAST UPDATED" value="Sep 3, 2026, 1:25 PM" />
          </section>
          <section className="items-section">
            <h2>Shipment items</h2>
            {shipmentItems.map(([name, quantity]) => (
              <div key={name}>
                <b>{name}</b>
                <span>Quantity: {quantity}</span>
              </div>
            ))}
          </section>
          <section className="timeline-section" id="support">
            <div className="timeline-heading">
              <div>
                <h2>Shipment travel history</h2>
                <p>Latest updates from your shipment.</p>
              </div>
              <span className="plain-button static-button">
                Get support <Arrow />
              </span>
            </div>
            <ol className="timeline">
              {travelHistory.map(
                ([date, title, description, location], index) => (
                  <li
                    className={index === 0 ? "timeline-current" : ""}
                    key={`${date}-${title}`}
                  >
                    <i>✓</i>
                    <div>
                      <small>{date}</small>
                      <b>{title}</b>
                      <p>{description}</p>
                      <em>{location}</em>
                    </div>
                  </li>
                ),
              )}
            </ol>
          </section>
        </div>
      </main>
      <footer className="simple-footer">
        © 2026 Westline. All rights reserved.
      </footer>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default App;
