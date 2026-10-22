import { useState } from "react";
import {
  ArrowRight,
  Gift,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ShoppingBag,
} from "lucide-react";
import "./App.css";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby34FJ4qOZsEEsqwv5Jtoiw7KF73sYv3fOiXodxNq1Z9-ruS9HoOtpIh7tdqYfMIQPokg/exec";



const prizes = [
  {
    image: "/images/prizes/s2.jpg",
    alt: "स्कूटर",
    title: "पहला पुरस्कार",
    detail: "स्कूटर जीतने का मौका",
  },
  {
    image: "/images/prizes/f1.jpg",
    alt: "फ्रिज",
    title: "दूसरा पुरस्कार",
    detail: "फ्रिज जीतने का मौका",
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
    image: "/images/prizes/home2.png",
    alt: "घरेलू उपकरण",
    title: "छठा पुरस्कार",
    detail: "घरेलू उपकरणों के उपहार",
  },
  {
    image: "/images/prizes/h1.png",
    alt: "हेयर ड्रायर",
    title: "सातवा पुरस्कार",
    detail: "हेयर ड्रायर",
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
  const [form, setForm] = useState({ name: "", phone: "", token: "", city: "" });
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
    const token = form.token.trim();
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
    if (!token || token.length > 50) {
      setStatus("कृपया 1 से 50 अक्षरों के बीच टोकन नंबर दर्ज करें।");
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
        token,
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

      setStatus("आपका फॉर्म सफलतापूर्वक सबमिट हो गया है। धन्यवाद!");
      setForm({ name: "", phone: "", token: "", city: "" });
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

      <header className="hero" id="home">
        <img
          className="hero-portrait"
          src="/images/prizes/banner.png"
          alt=""
          aria-hidden="true"
        />
        <div className="hero-caption">
          <span>KIARA KOTHARI</span>
          <span>JEWELLERY THAT FEELS LIKE YOU</span>
        </div>
      </header>

      <main>

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

        <section className="savings-scheme-section" id="savings-scheme" aria-label="मासिक बचत योजना">
          <img
            className="savings-scheme-image"
            src="/images/prizes/final.png"
            alt="कियारा कोठारी ज्वेलर्स की मासिक बचत योजना"
            loading="lazy"
          />
          <div className="savings-scheme-inner">
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

          </div>
        </section>

        <div className="scheme-details-layout">
          <img
            className="scheme-details-image"
            src="/images/prizes/kyu.png"
            alt="कियारा कोठारी ज्वेलर्स क्यों चुनें: गुणवत्ता, उपहार, बचत और व्यक्तिगत मार्गदर्शन"
            loading="lazy"
          />
          <section className="scheme-details-section" aria-label="योजना के लाभ और नियम">
            <div className="scheme-details-inner">
              <div className="scheme-benefits">
                <div className="scheme-benefits-heading">
                  <p className="eyebrow">THE KIARA KOTHARI DIFFERENCE</p>
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
        </div>

        <section className="register-section" id="register">
          <div className="register-intro">
            <p className="eyebrow"><Sparkles size={16} /> YOUR MOMENT STARTS HERE</p>
            <h2>
              Register for your <em>chance to win.</em>
            </h2>
            <p>
              लकी ड्रॉ में रजिस्ट्रेशन के लिए नीचे दी गई सभी जानकारी भरें।
              एक मोबाइल नंबर से केवल एक ही एंट्री स्वीकार की जाएगी।
            </p>
            <div className="trust-point"><CheckCircle2 size={18} /> एक मोबाइल नंबर से एक एंट्री</div>
            <div className="trust-point"><CheckCircle2 size={18} /> आसान रजिस्ट्रेशन</div>
          </div>

          <form className="registration-card" onSubmit={handleSubmit}>
            <div className="form-heading">
              <span className="form-icon"><Gift size={23} /></span>
              <div>
                <h3>Lucky Draw Registration</h3>
                <p>सभी जानकारी भरना अनिवार्य है।</p>
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

            <label htmlFor="token">टोकन नंबर *</label>
            <input
              id="token"
              name="token"
              type="text"
              value={form.token}
              onChange={handleChange}
              placeholder="अपना टोकन नंबर दर्ज करें"
              maxLength={50}
              autoComplete="off"
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
        <p className="footer-visit">आज ही हमारा स्टोर विजिट करे</p>
        <p className="footer-address"><MapPin size={17} /><span>प्लॉट नं. 132, भीम चौक, नारा रोड, जरीपटका, नागपुर – 440014</span></p>
        <p><Phone size={17} /><a href="tel:7066086060">70660 86060</a></p>
        <p><Phone size={17} /><a href="tel:7066046060">70660 46060</a></p>
        <p><Mail size={17} /><a href="mailto:kiarakotharijewellers@gmail.com">kiarakotharijewellers@gmail.com</a></p>
        <small>© {new Date().getFullYear()} Kiara Kothari Jewellers. All rights reserved.</small>
      </footer>
      <a
        className="whatsapp-float"
        href="https://wa.me/917066086060"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Kiara Kothari Jewellers on WhatsApp"
      >
        <MessageCircle size={30} aria-hidden="true" />
        <Phone className="whatsapp-float-phone" size={14} aria-hidden="true" />
      </a>
    </div>
  );
}
