
import { useState } from "react";
import {
  ArrowRight,
  Gift,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import "./App.css";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMoDhMRH4RUhPQVBm9elnO6SuAeM4w-coSkqLphQWodTWwLIdOoNkOqAhpdxL7-jAe/exec";

const prizes = [
  { icon: "🛵", title: "1st Prize", detail: "Two-wheeler" },
  { icon: "📺", title: "2nd Prize", detail: "Television" },
  { icon: "🧺", title: "3rd Prize", detail: "Washing machine" },
  {
    icon: "🎁",
    title: "More Prizes",
    detail: "Phones, appliances and gifts",
  },
];

export default function App() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
  });

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }


async function handleSubmit(e) {
  e.preventDefault();
  setStatus("");

  const name = form.name.trim();
  const phone = form.phone.replace(/\D/g, "");
  const city = form.city.trim();

  if (!name) {
    setStatus("Please enter your full name.");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    setStatus("Please enter a valid 10-digit mobile number.");
    return;
  }

  if (!city) {
    setStatus("Please enter your city or area.");
    return;
  }

  if (
    !SCRIPT_URL ||
    !SCRIPT_URL.startsWith("https://script.google.com/macros/s/") ||
    SCRIPT_URL.includes("PASTE_YOUR")
  ) {
    setStatus("Registration service is not configured correctly.");
    return;
  }

  setLoading(true);

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ name, phone, city }),
    });

    setStatus(
      "Your registration request has been sent. Please contact the store if you need confirmation."
    );

    setForm({
      name: "",
      phone: "",
      city: "",
    });
  } catch (error) {
    console.error("Registration request failed:", error);
    setStatus(
      "Could not send your request. Check your internet connection and try again."
    );
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="site-shell">
      <header className="hero" id="home">
        <nav className="navbar">
          <a className="logo" href="#home">
            KK
          </a>

          <a className="nav-button" href="#register">
            Register <ArrowRight size={16} />
          </a>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">
            <Sparkles size={16} />
            A little sparkle. A lot of celebration.
          </p>

          <h1>
            Celebrate the <em>sparkle.</em>
          </h1>

          <p className="hero-description">
            Shop for ₹10,000 and get a chance to win exciting gifts
            with Kiara Kothari Jewellers.
          </p>

          <div className="campaign-badge">
            <Gift size={18} />
            1 September 2026 – 31 January 2027
          </div>

          <a className="primary-button" href="#register">
            Enter the lucky draw <ArrowRight size={18} />
          </a>

          <p className="hero-note">
            Draw date shown on the poster: 7 February 2027
          </p>
        </div>
      </header>

      <main>
        <section className="prize-section">
          <div className="section-heading">
            <p className="eyebrow dark">A celebration of you</p>

            <h2>
              Wonderful prizes.
              <br />
              <em>More reasons to sparkle.</em>
            </h2>

            <p>
              Register your details for the Kiara Kothari Jewellers
              lucky draw. Make sure your mobile number is correct.
            </p>
          </div>

          <div className="prize-grid">
            {prizes.map((prize) => (
              <article className="prize-card" key={prize.title}>
                <span className="prize-icon">{prize.icon}</span>
                <h3>{prize.title}</h3>
                <p>{prize.detail}</p>
              </article>
            ))}
          </div>

          <p className="terms">
            Participation is subject to the store's official campaign
            terms and eligibility requirements.
          </p>
        </section>

        <section className="register-section" id="register">
          <div className="register-intro">
            <p className="eyebrow">
              <Sparkles size={16} />
              Your moment starts here
            </p>

            <h2>
              Register for your
              <br />
              <em>chance to win.</em>
            </h2>

            <p>
              Fill in the three details below to register for the
              campaign. Only one entry per mobile number is allowed.
            </p>

            <div className="trust-point">
              <CheckCircle2 size={18} />
              One entry per mobile number
            </div>

            <div className="trust-point">
              <CheckCircle2 size={18} />
              Quick registration
            </div>
          </div>

          <form className="registration-card" onSubmit={handleSubmit}>
            <div className="form-heading">
              <Gift size={24} />

              <div>
                <h3>Lucky Draw Registration</h3>
                <p>Complete all three fields.</p>
              </div>
            </div>

            <label htmlFor="name">Full name *</label>

            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              maxLength={100}
              autoComplete="name"
              required
            />

            <label htmlFor="phone">Mobile number *</label>

            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              autoComplete="tel"
              required
            />

            <label htmlFor="city">City / area *</label>

            <input
              id="city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              placeholder="e.g. Jaripatka, Nagpur"
              maxLength={100}
              autoComplete="address-level2"
              required
            />

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit registration"}
              <ArrowRight size={18} />
            </button>

            {status && (
              <p className="form-status" role="status">
                {status}
              </p>
            )}

            <p className="privacy-note">
              Your details will be processed for campaign registration.
            </p>
          </form>
        </section>
      </main>

      <footer className="footer">
        <a className="logo" href="#home">
          KK
        </a>

        <h2>Kiara Kothari Jewellers</h2>

        <p>
          <MapPin size={17} />
          Plot No. 132, Bhim Chowk, Nara Road,
          Jaripatka, Nagpur – 14
        </p>

        <p>
          <Phone size={17} />
          <a href="https://wa.me/919270132228">
            9270132228 · WhatsApp
          </a>
        </p>

        <p>
          <Mail size={17} />
          <a href="mailto:kiarakotharijewellers@gmail.com">
            kiarakotharijewellers@gmail.com
          </a>
        </p>

        <small>
          © {new Date().getFullYear()} Kiara Kothari Jewellers
        </small>
      </footer>
    </div>
  );
}
