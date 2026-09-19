import { useState } from 'react';
import { showToast } from '../components/Toast';

const EMAIL = 'zyadalasd47@gmail.com';
const WHATSAPP = '201022568997';
const ENDPOINT = `https://formsubmit.co/ajax/${EMAIL}`;

export const WhatsAppIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

export default function ContactPage({ effectivePage }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      showToast('اكتب اسمك ورسالتك أولاً', 'error');
      return;
    }
    setSending(true);
    setSent(false);
    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `✉️ رسالة جديدة من موقع هُدَى — ${name.trim()}`,
          _template: 'table',
          _captcha: 'false',
          'الاسم': name.trim(),
          'البريد للرد (اختياري)': email.trim() || 'لم يُدخل',
          'الرسالة': message.trim(),
        }),
      });
      if (!resp.ok) throw new Error('send failed');
      showToast('وصلت رسالتك بنجاح، شكراً لك!', 'success');
      setName(''); setEmail(''); setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 10000);
    } catch {
      showToast('تعذر الإرسال الآن — جرّب الواتساب أو حاول لاحقاً', 'error');
    } finally {
      setSending(false);
    }
  };

  const waReady = name.trim() && message.trim();
  const waText = encodeURIComponent(
    `السلام عليكم 🌿\nأنا *${name.trim()}* من موقع هُدَى.\n\n${message.trim()}`
  );

  return (
    <section className={`page-section ${effectivePage === 'contact' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-envelope"></i> تواصل معنا</h1>
        <p>ملاحظة، اقتراح، أو فكرة لتطوير المشروع — كل شيء يصلنا مباشرة</p>
      </div>
      <div className="page-content">
        <div className="contact-wrap">
          <form className="contact-card" onSubmit={submit}>
            <div className="contact-fields">
              <div className="contact-field">
                <label htmlFor="ct-name"><i className="fas fa-user"></i> الاسم</label>
                <input id="ct-name" type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="اكتب اسمك" maxLength={80} />
              </div>
              <div className="contact-field">
                <label htmlFor="ct-email"><i className="fas fa-at"></i> بريدك للرد <span className="contact-opt">(اختياري)</span></label>
                <input id="ct-email" type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@mail.com" maxLength={120} />
              </div>
            </div>
            <div className="contact-field">
              <label htmlFor="ct-msg"><i className="fas fa-comment-dots"></i> رسالتك أو اقتراحك</label>
              <textarea id="ct-msg" rows={7} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="شاركنا اقتراحك لتطوير الموقع، أو أي ملاحظة تود إبلاغنا بها..." maxLength={3000} />
            </div>
            <button type="submit" className={`contact-send ${sending ? 'sending' : ''}`} disabled={sending}>
              {sending
                ? <><span className="contact-send-spinner"></span> جاري الإرسال...</>
                : <><i className="fas fa-paper-plane"></i> إرسال الرسالة</>}
            </button>
            {sent && (
              <div className="contact-success">
                <span className="cs-check"><i className="fas fa-check"></i></span>
                <div className="cs-text">
                  <strong>تم الإرسال بنجاح، شكراً لك!</strong>
                  <span>وصلت رسالتك إلى إدارة الموقع وسنرد عليك قريباً إن شاء الله</span>
                </div>
              </div>
            )}
            {!sent && (
              <p className="contact-note"><i className="fas fa-lock"></i> تُرسل رسالتك بشكل خاص مباشرة إلى بريد إدارة الموقع</p>
            )}
          </form>

          <aside className="contact-side">
            <h3><i className="fas fa-headset"></i> قنوات أخرى</h3>
            <a className="contact-channel is-whatsapp"
              href={`https://wa.me/${WHATSAPP}${waReady ? `?text=${waText}` : ''}`}
              target="_blank" rel="noreferrer">
              <span className="cc-icon"><WhatsAppIcon size={30} /></span>
              <span className="cc-body">
                <strong>راسلنا على واتساب</strong>
                <span dir="ltr">+20 10 2256 8997</span>
                <em>{waReady ? 'ستنتقل برسالتك جاهزة للإرسال' : 'اضغط للمحادثة الفورية'}</em>
              </span>
            </a>
            <a className="contact-channel is-mail" href={`mailto:${EMAIL}`} target="_blank" rel="noreferrer">
              <span className="cc-icon"><i className="fas fa-envelope"></i></span>
              <span className="cc-body">
                <strong>البريد الإلكتروني</strong>
                <span dir="ltr">{EMAIL}</span>
                <em>للاقتراحات والاستفسارات</em>
              </span>
            </a>
            <div className="contact-dua">
              <p>كل اقتراح يهمنا ويطوّر الموقع بإذن الله</p>
              <span>جزاك الله خيراً على وقتك 🌿</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
