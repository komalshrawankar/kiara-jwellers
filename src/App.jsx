import { useState } from "react";
import {
  ArrowRight,
  Gift,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
  Heart,
  ChevronRight,
} from "lucide-react";
import "./App.css";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby34FJ4qOZsEEsqwv5Jtoiw7KF73sYv3fOiXodxNq1Z9-ruS9HoOtpIh7tdqYfMIQPokg/exec";

const featuredJewellery = [
  {
    category: "THE CLASSICS",
    title: "Diamond Rings",
    description: "Timeless brilliance, made to be treasured.",
    image:
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=85",
    alt: "Luxury diamond ring",
  },
  {
    category: "MADE FOR TWO",
    title: "Couple Rings",
    description: "Two hearts. One beautiful promise.",
    image:
      "https://images.unsplash.com/photo-1603561596112-0a132b757442?auto=format&fit=crop&w=1000&q=85",
    alt: "Elegant couple rings",
  },
  {
    category: "THE FINISHING TOUCH",
    title: "Statement Earrings",
    description: "A little sparkle for every special moment.",
    image:
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=85",
    alt: "Statement jewellery earrings",
  },
];

const prizes = [
  {
    image: "/images/prizes/scooter.jpg",
    alt: "स्कूटर",
    title: "पहला पुरस्कार",
    detail: "स्कूटर जीतने का मौका",
  },
  {
    image: "/images/prizes/phone.jpg",
    alt: "स्मार्टफोन",
    title: "दूसरा एवं पांचवां पुरस्कार",
    detail: "स्मार्टफोन जीतने का मौका",
  },
  {
    image: "/images/prizes/washing.jpg",
    alt: "वॉशिंग मशीन",
    title: "तीसरा पुरस्कार",
    detail: "वॉशिंग मशीन",
  },
  {
    image: "/images/prizes/tv.jpg",
    alt: "LED टीवी",
    title: "चौथा पुरस्कार",
    detail: "LED टीवी",
  },
  {
    image: "/images/prizes/micture.jpg",
    alt: "घरेलू उपकरण",
    title: "छठा एवं सातवां पुरस्कार",
    detail: "घरेलू उपकरणों के उपहार",
  },
];

function requestRegistrationService(params) {
  return new Promise((resolve, reject) => {
    const callbackName = `checkPhone_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;
    const script = document.createElement("script");
    let completed = false;
    let timeout;

    function cleanup() {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Mobile number check timed out."));
    }, 15000);

    window[callbackName] = (result) => {
      cleanup();
      if (!result || typeof result !== "object") {
        reject(new Error("Invalid response from registration service."));
        return;
      }
      resolve(result);
    };

    script.onerror = () => {
      cleanup();
      reject(
        new Error(
          "Could not reach the registration service. Please check the web app deployment and try again."
        )
      );
    };

    params.set("callback", callbackName);

    script.src = `${APPS_SCRIPT_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });
}

function checkPhoneNumber(phone) {
  return requestRegistrationService(
    new URLSearchParams({ action: "check", phone })
  ).then((result) => {
    if (typeof result.exists !== "boolean") {
      throw new Error("Invalid response from registration service.");
    }
    return result.exists;
  });
}

async function waitForRegistration(requestId) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await requestRegistrationService(
      new URLSearchParams({ action: "status", requestId })
    );

    if (result.status === "registered" || result.status === "duplicate") {
      return result;
    }
    if (result.status === "error") {
      throw new Error(result.message || "Registration could not be completed.");
    }
    if (result.status !== "pending" && result.status !== "unknown") {
      throw new Error("Invalid response from registration service.");
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  throw new Error("Registration is taking longer than expected. Please try again.");
}

export default function App() {
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setStatus("");

    const name = form.name.trim();
    const phone = form.phone.replace(/\D/g, "");
    const city = form.city.trim();

    if (!name) {
      setStatus("कृपया अपना पूरा नाम दर्ज करें।");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setStatus("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }
    if (!city) {
      setStatus("कृपया अपना शहर या क्षेत्र दर्ज करें।");
      return;
    }

    setLoading(true);
    try {
      const alreadyRegistered = await checkPhoneNumber(phone);
      if (alreadyRegistered) {
        setStatus("यह मोबाइल नंबर पहले से रजिस्टर है। कृपया दूसरा नंबर इस्तेमाल करें।");
        return;
      }

      const requestId = crypto.randomUUID();
      const formData = new URLSearchParams({
        action: "register",
        requestId,
        name,
        phone,
        city,
      });
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      const result = await waitForRegistration(requestId);
      if (result.status === "duplicate") {
        setStatus("यह मोबाइल नंबर पहले से रजिस्टर है। कृपया दूसरा नंबर इस्तेमाल करें।");
        return;
      }

      setStatus("आपका रजिस्ट्रेशन सफलतापूर्वक हो गया है। धन्यवाद!");
      setForm({ name: "", phone: "", city: "" });
    } catch (error) {
      console.error("Registration error:", error);

      setStatus(
        error?.message
          ? `रजिस्ट्रेशन नहीं हो सका: ${error.message}`
          : "Registration service से संपर्क नहीं हो पाया।"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="hero" id="home">
        <nav className="navbar">
          <a className="logo" href="#home" aria-label="Kiara Kothari Jewellers Home">
            <img src="/images/prizes/logo.png" alt="Kiara Kothari Jewellers" />
          </a>

          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#collections">Collections</a>
            <a href="#prizes">Lucky Draw</a>
            <a href="#contact">Contact</a>
            <a href="#register" className="nav-button">
              Register <ArrowRight size={16} />
            </a>
          </div>
          <a className="mobile-register" href="#register" aria-label="Register for lucky draw">
            <ShoppingBag size={18} />
          </a>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">
            <Sparkles size={15} /> THE ART OF FINE JEWELLERY
          </p>
          <h1>
            Discover your <em>sparkle.</em>
          </h1>
          <p className="hero-description">
            Jewellery that celebrates your story. Discover timeless designs,
            beautiful craftsmanship, and a little extra joy with every special
            purchase.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#collections">
              Explore collection <ArrowRight size={17} />
            </a>
            <a className="text-button" href="#prizes">
              Discover the offer <ChevronRight size={17} />
            </a>
          </div>
          <div className="campaign-badge">
            <Gift size={17} />
            <span>Shop gold jewellery worth ₹10,000 and enjoy a chance to win gifts</span>
          </div>
          <p className="hero-note">Offer valid 1 September 2026 – 31 January 2027</p>
        </div>
        <div className="hero-caption">
          <span>KIARA KOTHARI</span>
          <span>JEWELLERY THAT FEELS LIKE YOU</span>
        </div>
      </header>

      <main>
        <section className="collections-section" id="collections">
          <div className="section-topline">
            <p className="eyebrow dark">CURATED FOR YOUR MOMENTS</p>
            <span className="section-index">01 / COLLECTIONS</span>
          </div>
          <div className="collections-heading">
            <h2>
              Find the piece that <em>feels like you.</em>
            </h2>
            <p>
              From everyday elegance to once-in-a-lifetime celebrations, find
              jewellery made to become part of your story.
            </p>
          </div>

          <div className="featured-grid">
            {featuredJewellery.map((item, index) => (
              <article className="featured-card" key={item.title} style={{ "--card-index": index }}>
                <a className="featured-image-link" href="#register" aria-label={`Explore ${item.title}`}>
                  <img src={item.image} alt={item.alt} loading="lazy" />
                  <span className="image-number">0{index + 1}</span>
                  <span className="round-arrow"><ArrowRight size={18} /></span>
                </a>
                <div className="featured-copy">
                  <p className="card-category">{item.category}</p>
                  <div className="featured-title-row">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <Heart className="heart-icon" size={19} strokeWidth={1.4} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* <section className="editorial-section">
          <div className="editorial-image">
            <img
              src="https://i.pinimg.com/736x/0f/aa/86/0faa86a89281e8699af07cc4965208a9.jpg"
              alt="Luxury gold jewellery styled on a dark background"
              loading="lazy"
            />
            <span className="editorial-stamp"><Sparkles size={18} /> MADE FOR YOUR MOMENTS</span>
          </div>
          <div className="editorial-copy">
            <p className="eyebrow dark">A LITTLE MORE MAGIC</p>
            <h2>Every occasion deserves a <em>little sparkle.</em></h2>
            <p>
              Make your celebrations even more memorable with jewellery that
              brings together timeless beauty and the joy of giving. And this
              season, your purchase could bring home something extra.
            </p>
            <a className="dark-button" href="#prizes">
              Explore the lucky draw <ArrowRight size={17} />
            </a>
          </div>
        </section> */}

        <section className="prize-section" id="prizes">
          <div className="section-heading">
            <p className="eyebrow dark">लकी ड्रॉ 2026–27</p>
            <h2>
              शानदार उपहार जीतने का मौका
              <br />
              <em>आपकी खरीदारी के साथ खुशियों का मौका भी!</em>
            </h2>

            <div className="offer-highlight">
              <p>₹10,000 की सोने की ज्वेलरी खरीदने पर</p>
              <h3>पाएं ढेर सारे उपहार!</h3>
            </div>

            <div className="offer-dates">
              <div className="offer-date-item">
                <span>ऑफर अवधि</span>
                <strong>1 सितंबर 2026 से 31 जनवरी 2027</strong>
              </div>
              <div className="offer-date-item">
                <span>लकी ड्रॉ की तारीख</span>
                <strong>7 फरवरी 2027</strong>
              </div>
            </div>
          </div>

          <div className="prize-grid">
            {prizes.map((prize) => (
              <article className="prize-card" key={prize.title}>
                <div className="prize-image-wrapper">
                  <img
                    src={prize.image}
                    alt={prize.alt}
                    className="prize-image"
                    loading="lazy"
                  />
                </div>
                <span className="prize-number">{prize.title}</span>
                <h3>{prize.detail}</h3>
              </article>
            ))}
          </div>
          <p className="terms">
            लकी ड्रॉ में भागीदारी स्टोर के आधिकारिक नियमों और पात्रता शर्तों के अधीन है।
          </p>
        </section>

        <section className="savings-scheme-section" id="savings-scheme" aria-labelledby="savings-scheme-title">
          <div className="savings-scheme-backdrop" aria-hidden="true" />
          <div className="savings-scheme-inner">
            <div className="savings-scheme-copy">
              <p className="eyebrow">KOTHARI JEWELLERS · MONTHLY SAVINGS PLAN</p>
              <h2 id="savings-scheme-title">
                हर महीने बचत करें,<br />
                <em>अतिरिक्त लाभ पाएं!</em>
              </h2>
              <p className="savings-scheme-lead">
                कियारा कोठारी ज्वेलर्स की मासिक बचत योजना के साथ अपनी ज्वेलरी खरीदारी की योजना बनाएं।
                नियमित बचत करें और अपनी पसंद की ज्वेलरी के लिए बेहतर तरीके से तैयार रहें।
              </p>
            </div>

            <div className="savings-table-wrap">
              <table className="savings-table">
                <thead>
                  <tr>
                    <th>मासिक बचत</th>
                    <th>12 महीने की बचत</th>
                    <th>अतिरिक्त लाभ</th>
                    <th>कुल राशि</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>₹1,000</td><td>₹12,000</td><td>₹1,500</td><td>₹13,500</td></tr>
                  <tr><td>₹10,000</td><td>₹1,20,000</td><td>₹15,000</td><td>₹1,35,000</td></tr>
                  <tr><td>₹1,00,000</td><td>₹12,00,000</td><td>₹1,50,000</td><td>₹13,50,000</td></tr>
                </tbody>
              </table>
              <p className="savings-table-note">योजना की पात्रता और लाभ की विस्तृत जानकारी के लिए कृपया स्टोर से संपर्क करें।</p>
            </div>

            <div className="scheme-benefits">
              <div className="scheme-benefits-heading">
                <p className="eyebrow">THE KOTHARI DIFFERENCE</p>
                <h3>कियारा कोठारी ज्वेलर्स क्यों चुनें?</h3>
              </div>
              <div className="scheme-benefit-grid">
                <div className="scheme-benefit"><span className="scheme-benefit-number">01</span><p>22 कैरेट और 18 कैरेट सोने की ज्वेलरी।</p></div>
                <div className="scheme-benefit"><span className="scheme-benefit-number">02</span><p>शानदार लकी ड्रॉ उपहार जीतने का अवसर।</p></div>
                <div className="scheme-benefit"><span className="scheme-benefit-number">03</span><p>मासिक बचत योजना के साथ अतिरिक्त लाभ।</p></div>
                <div className="scheme-benefit"><span className="scheme-benefit-number">04</span><p>आपकी जरूरतों के अनुसार व्यक्तिगत मार्गदर्शन।</p></div>
              </div>
            </div>

            <div className="scheme-terms">
              <h3>नियम एवं शर्तें</h3>
              <ol>
                <li>यह ऑफर केवल 22K या 18K सोने की ज्वेलरी की खरीदारी पर लागू है।</li>
                <li>मेकिंग चार्ज 12% से 15% के बीच निर्धारित रहेगा।</li>
                <li>लकी ड्रॉ ऑफर की अवधि 1 सितंबर 2026 से 31 जनवरी 2027 तक है।</li>
                <li>लकी ड्रॉ 7 फरवरी 2027 को आयोजित किया जाएगा।</li>
                <li>लकी ड्रॉ में भाग लेने की पात्रता, कूपन संबंधी नियम और पुरस्कार वितरण की पूरी जानकारी स्टोर से प्राप्त करें।</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="register-section" id="register">
          <div className="register-intro">
            <p className="eyebrow"><Sparkles size={16} /> YOUR MOMENT STARTS HERE</p>
            <h2>
              Register for your <em>chance to win.</em>
            </h2>
            <p>
              लकी ड्रॉ में रजिस्ट्रेशन के लिए नीचे दी गई तीनों जानकारी भरें।
              एक मोबाइल नंबर से केवल एक ही एंट्री स्वीकार की जाएगी।
            </p>
            <div className="trust-point"><CheckCircle2 size={18} /> एक मोबाइल नंबर से एक एंट्री</div>
            <div className="trust-point"><CheckCircle2 size={18} /> आसान रजिस्ट्रेशन</div>
            <div className="register-contact">
              <span><Phone size={16} /> Need help? Call us</span>
              <a href="https://wa.me/919270132228">9270132228</a>
            </div>
          </div>

          <form className="registration-card" onSubmit={handleSubmit}>
            <div className="form-heading">
              <span className="form-icon"><Gift size={23} /></span>
              <div>
                <h3>Lucky Draw Registration</h3>
                <p>तीनों जानकारी भरना अनिवार्य है।</p>
              </div>
            </div>

            <label htmlFor="name">पूरा नाम *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="अपना पूरा नाम दर्ज करें"
              maxLength={100}
              autoComplete="name"
              required
            />

            <label htmlFor="phone">मोबाइल नंबर *</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={handleChange}
              placeholder="10 अंकों का मोबाइल नंबर"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              autoComplete="tel"
              required
            />

            <label htmlFor="city">शहर / क्षेत्र *</label>
            <input
              id="city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              placeholder="जैसे: जरिपटका, नागपुर"
              maxLength={100}
              autoComplete="address-level2"
              required
            />

            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? "जाँच और रजिस्ट्रेशन जारी है..." : "रजिस्ट्रेशन करें"}
              <ArrowRight size={18} />
            </button>

            {status && (
              <p className="form-status" role="status" aria-live="polite">{status}</p>
            )}
            <p className="privacy-note">
              आपकी जानकारी का उपयोग लकी ड्रॉ रजिस्ट्रेशन के लिए किया जाएगा।
            </p>
          </form>
        </section>
      </main>

      <footer className="footer" id="contact">
        <a className="logo footer-logo" href="#home" aria-label="Kiara Kothari Jewellers Home">
          <img src="/images/prizes/logo.png" alt="Kiara Kothari Jewellers" />
        </a>
        <p className="footer-kicker">TIMELESS BY DESIGN</p>
        <h2>Kiara Kothari Jewellers</h2>
        <p><MapPin size={17} /> Plot No. 132, Bhim Chowk, Nara Road, Jaripatka, Nagpur – 14</p>
        <p><Phone size={17} /><a href="https://wa.me/919270132228">9270132228 · WhatsApp</a></p>
        <p><Mail size={17} /><a href="mailto:kiarakotharijewellers@gmail.com">kiarakotharijewellers@gmail.com</a></p>
        <small>© {new Date().getFullYear()} Kiara Kothari Jewellers. All rights reserved.</small>
      </footer>
    </div>
  );
}
