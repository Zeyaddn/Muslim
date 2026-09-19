import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import ISLAMIC_DATA from '../data/islamic-data';
import { copyText, htmlToDuaText, parseDuaCount, stripCountHints, arabizeRef, extractHisnRef, toArabicNum } from '../utils';
import { showToast } from '../components/Toast';

const DHIKR_API = 'https://api.islamic.app/v1/dhikr';

const FEATURED = [
  { key: 'morning', label: 'أذكار الصباح', desc: 'تُقال بعد صلاة الفجر', icon: 'fa-sun' },
  { key: 'evening', label: 'أذكار المساء', desc: 'تُقال بعد صلاة العصر', icon: 'fa-cloud-moon' },
  { key: '28', label: 'أذكار النوم', desc: 'قبل النوم مباشرة', icon: 'fa-bed' },
];

const ESSENTIAL_NUMS = ['1', '25', '15', '129', '130', '35', '34', '96', '105', '69', '70', '11'];

const AR_DIGITS = s => String(s || '').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const stripLatin = s => String(s || '').replace(/[A-Za-z\u00C0-\u024F'’]{2,}/g, '').replace(/[ \t]+/g, ' ').trim();
const stripMarks = s => String(s || '').replace(/\p{M}/gu, '');

// Renders dhikr text; quotes of Quran ({ ... * ... }) get ayah-number
// badges like the Quran reader, plus fixes a missing waw in Al-Ikhlas.
function DuaText({ text }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('{')) {
      let buf = line;
      while (!buf.includes('}') && i + 1 < lines.length) { i++; buf += ' ' + lines[i]; }
      const verses = buf.replace(/[{}]/g, '').split('*').map(v => v.trim()).filter(Boolean).map(v => {
        const st = stripMarks(v);
        if (st.includes('لم يكن له') && st.includes('كفوا') && !st.startsWith('و')) return 'وَ' + v;
        return v;
      });
      if (verses.length) blocks.push({ type: 'surah', verses });
    } else if (stripMarks(line) === 'بسم الله الرحمن الرحيم') {
      blocks.push({ type: 'basmalah' });
    } else if (line.trim()) {
      blocks.push({ type: 'plain', text: line });
    }
    i++;
  }
  return (
    <>
      {blocks.map((b, bi) => b.type === 'surah' ? (
        <div key={bi} className="ak-surah">
          <p className="ak-verses">
            {b.verses.map((v, vi) => (
              <span key={vi}>
                {v} <span className="ak-ayah-num">{toArabicNum(vi + 1)}</span>{' '}
              </span>
            ))}
          </p>
        </div>
      ) : b.type === 'basmalah' ? (
        <p key={bi} className="ak-basmalah">بسم الله الرحمن الرحيم</p>
      ) : (
        <p key={bi} className="ak-plain">{b.text}</p>
      ))}
    </>
  );
}

function iconForCategory(name) {
  const n = String(name || '');
  if (/نوم|استيقاظ/.test(n)) return 'fa-moon';
  if (/مسجد/.test(n)) return 'fa-mosque';
  if (/سفر|ركوب|طيران|سيارة|حافلة|قطار|سكة/.test(n)) return 'fa-plane-departure';
  if (/منزل|بيت/.test(n)) return 'fa-house-chimney';
  if (/خلاء|قضاء الحاجة/.test(n)) return 'fa-door-closed';
  if (/وضوء/.test(n)) return 'fa-hand-holding-water';
  if (/طعام|أكل|شرب|لبن|تمر|طعامه|سُحور/.test(n)) return 'fa-utensils';
  if (/ثوب|لباس|شماغ|عمامة|كوفية|بنطال|خف/.test(n)) return 'fa-shirt';
  if (/مطر|غيث/.test(n)) return 'fa-cloud-rain';
  if (/رياح|ريح/.test(n)) return 'fa-wind';
  if (/رعد/.test(n)) return 'fa-cloud-bolt';
  if (/هم|كرب|غم|حزن|قلق|ضيق|فزع/.test(n)) return 'fa-hand-holding-heart';
  if (/رقية|مرض|مريض|ألم/.test(n)) return 'fa-heart-pulse';
  if (/صلاة|قنوت|وتر|سجود|استفتاح|تكبير/.test(n)) return 'fa-person-praying';
  if (/استغفار|توبة/.test(n)) return 'fa-hands-praying';
  if (/جمعة/.test(n)) return 'fa-users';
  if (/عطسة|عطاس/.test(n)) return 'fa-face-flushed';
  if (/مرآة|شعر/.test(n)) return 'fa-magnifying-glass';
  if (/سوق|تجارة|بيع|شراء/.test(n)) return 'fa-store';
  if (/عودة|رجوع/.test(n)) return 'fa-rotate-left';
  return 'fa-hands-praying';
}

export default function AdhkarPage({
  effectivePage, adhkarPlaying, adhkarPaused, adhkarAudioLoading,
  playAdhkarAudio, setTasbeehDhikr, setTasbeehCount, effectiveNavigate,
}) {
  const [cats, setCats] = useState([]);
  const [catSearch, setCatSearch] = useState('');
  const [showAllCats, setShowAllCats] = useState(false);
  const [openCat, setOpenCat] = useState(null);
  const [duas, setDuas] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loadingCat, setLoadingCat] = useState(false);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    let alive = true;
    fetch(DHIKR_API).then(r => r.json()).then(j => {
      if (alive && j.data?.categories) {
        setCats([...j.data.categories].sort((a, b) => Number(a.number) - Number(b.number)));
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const openCategory = useCallback((cat) => {
    setOpenCat(cat);
    setIdx(0);
    setDuas(null);
    const key = String(cat.number);
    const cached = cacheRef.current.get(key);
    if (cached) { setDuas(cached); return; }
    setLoadingCat(true);
    fetch(`${DHIKR_API}/${key}`).then(r => r.json()).then(j => {
      const list = (j.data?.duas || []).map(d => {
        const rawAr = htmlToDuaText(d.ar?.body || d.ar?.text || '');
        const rawRef = d.en?.reference || extractHisnRef(d.en?.body) || '';
        return {
          text: stripLatin(stripCountHints(rawAr)),
          count: parseDuaCount(rawAr, d.en?.text || ''),
          ref: rawRef && rawRef.length <= 90 ? AR_DIGITS(arabizeRef(rawRef)) : '',
        };
      }).filter(x => x.text);
      cacheRef.current.set(key, list);
      setDuas(list);
    }).catch(() => showToast('تعذر تحميل الأذكار، حاول مرة أخرى', 'error')).finally(() => setLoadingCat(false));
  }, []);

  const closeModal = useCallback(() => { setOpenCat(null); setDuas(null); setIdx(0); }, []);
  const goPrev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIdx(i => Math.min((duas?.length || 1) - 1, i + 1)), [duas]);

  useEffect(() => {
    if (!openCat) return;
    const h = e => {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowRight') goPrev();
      else if (e.key === 'ArrowLeft') goNext();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [openCat, goPrev, goNext, closeModal]);

  const catByNumber = useRef(null);
  if (!catByNumber.current && cats.length > 0) {
    catByNumber.current = Object.fromEntries(cats.map(c => [String(c.number), c]));
  }

  const essentials = catByNumber.current
    ? ESSENTIAL_NUMS.map(n => catByNumber.current[n]).filter(Boolean)
    : [];

  const searching = Boolean(catSearch.trim());
  const filteredCats = searching
    ? cats.filter(c => (c.ar || '').includes(catSearch.trim()))
    : [];
  const visibleGridCats = searching ? filteredCats : (showAllCats ? cats : essentials);

  const current = duas && duas[idx];

  const startTasbeehForCurrent = () => {
    if (!current) return;
    const found = ISLAMIC_DATA.tasbeehOptions.find(t => current.text.includes(t.name));
    setTasbeehDhikr(found || ISLAMIC_DATA.tasbeehOptions[0]);
    setTasbeehCount(0);
    effectiveNavigate('tasbeeh');
    showToast(found ? 'تم فتح المسبحة على: ' + found.name : 'تم فتح المسبحة', found ? 'success' : 'info');
  };

  return (
    <section className={`page-section ${effectivePage === 'adhkar' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-praying-hands"></i> الأذكار والدعاء</h1>
        <p>أذكار وأدعية نبوية صحيحة من حصن المسلم في كل الأوقات والمواقف</p>
      </div>
      <div className="page-content">
        <div className="adhkar-player">
          <div className="adhkar-player-label"><i className="fas fa-headphones"></i> استماع بصوت الشيخ محمد جبريل</div>
          <div className="adhkar-player-buttons">
            <button
              className={`adhkar-play-btn ${adhkarPlaying === 'morning' ? 'active' : ''} ${adhkarAudioLoading === 'morning' ? 'loading' : ''}`}
              onClick={() => playAdhkarAudio('morning')}
            >
              <i className={`fas ${adhkarAudioLoading === 'morning' ? 'fa-spinner fa-spin' : adhkarPlaying === 'morning' && !adhkarPaused ? 'fa-pause' : 'fa-play'}`}></i>
              {adhkarAudioLoading === 'morning' ? 'جاري التحميل...' : 'أذكار الصباح'}
            </button>
            <button
              className={`adhkar-play-btn ${adhkarPlaying === 'evening' ? 'active' : ''} ${adhkarAudioLoading === 'evening' ? 'loading' : ''}`}
              onClick={() => playAdhkarAudio('evening')}
            >
              <i className={`fas ${adhkarAudioLoading === 'evening' ? 'fa-spinner fa-spin' : adhkarPlaying === 'evening' && !adhkarPaused ? 'fa-pause' : 'fa-play'}`}></i>
              {adhkarAudioLoading === 'evening' ? 'جاري التحميل...' : 'أذكار المساء'}
            </button>
          </div>
        </div>

        <div className="adhkar-section-title"><i className="fas fa-star"></i> الأذكار الأساسية</div>
        <div className="adhkar-featured-grid">
          {FEATURED.map(f => (
            <button
              key={f.key}
              className={`adhkar-featured-card featured-${f.key}`}
              onClick={() => openCategory({ number: f.key, ar: f.label, icon: f.icon })}
            >
              <span className="adhkar-featured-icon"><i className={`fas ${f.icon}`}></i></span>
              <span className="adhkar-featured-name">{f.label}</span>
              <span className="adhkar-featured-desc">{f.desc}</span>
            </button>
          ))}
        </div>

        <div className="adhkar-section-title"><i className="fas fa-list"></i> مواقف وأحوال</div>

        <div className="search-bar" style={{ marginBottom: 16 }}>
          <i className="fas fa-search search-icon"></i>
          <input type="text" placeholder="ابحث عن قسم... (السفر، النوم، الطعام)" value={catSearch} onChange={e => setCatSearch(e.target.value)} />
          {searching && (
            <button className="cat-search-clear" onClick={() => setCatSearch('')} aria-label="مسح البحث">
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {visibleGridCats.length > 0 ? (
          <div className="adhkar-cats-grid">
            {visibleGridCats.map(c => (
              <button key={c.number} className="adhkar-cat-card" onClick={() => openCategory(c)}>
                <span className="adhkar-cat-icon"><i className={`fas ${iconForCategory(c.ar)}`}></i></span>
                <span className="adhkar-cat-name">{c.ar}</span>
                <span className="adhkar-cat-count">{c.count} ذكر</span>
              </button>
            ))}
          </div>
        ) : searching ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
            <i className="fas fa-magnifying-glass" style={{ fontSize: '1.5rem', marginBottom: 10 }}></i>
            <p>لا توجد نتائج مطابقة لبحثك</p>
          </div>
        ) : null}

        {!searching && !showAllCats && (
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <button className="adhkar-showall-btn" onClick={() => setShowAllCats(true)}>
              <i className="fas fa-chevron-down"></i> عرض كل الأقسام ({cats.length || 132})
            </button>
          </div>
        )}
        {!searching && showAllCats && (
          <div style={{ textAlign: 'center', marginTop: 22 }}>
            <button className="adhkar-showall-btn" onClick={() => setShowAllCats(false)}>
              <i className="fas fa-chevron-up"></i> عرض الأقسام الأساسية فقط
            </button>
          </div>
        )}

        {cats.length === 0 && !searching && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.6rem', marginBottom: 12 }}></i>
            <p>جاري تحميل الأقسام...</p>
          </div>
        )}
      </div>

      {openCat && createPortal(
        <div className="quiz-modal-overlay open" onClick={closeModal}>
          <div className="adhkar-modal-content" onClick={e => e.stopPropagation()}>
            <div className="ak-modal-head">
              <span className="ak-modal-title">
                <i className={`fas ${openCat.icon || iconForCategory(openCat.ar)}`}></i>
                {openCat.ar}
              </span>
              <button className="modal-close" onClick={closeModal} aria-label="إغلاق"><i className="fas fa-times"></i></button>
            </div>

            <div className="ak-progress-bar">
              <div className="ak-progress-fill" style={{ width: `${((idx + 1) / (duas?.length || 1)) * 100}%` }}></div>
            </div>

            {loadingCat ? (
              <div className="ak-modal-body">
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: 'var(--primary)' }}></i>
                <span className="ak-counter">جاري التحميل...</span>
              </div>
            ) : current ? (
              <>
                <div className="ak-modal-body">
                  <span className="ak-counter">الذكر {toArabicNum(idx + 1)} من {toArabicNum(duas.length)}</span>
                  <div className="ak-text" key={idx}><DuaText text={current.text} /></div>
                  <div className="ak-chips">
                    <span className="ak-chip">
                      <i className="fas fa-repeat"></i> {current.count === 1 ? 'مرة واحدة' : `${toArabicNum(current.count)} ${current.count >= 11 ? 'مرة' : 'مرات'}`}
                    </span>
                    <button className="ak-icon-btn" onClick={() => copyText(current.text)} aria-label="نسخ"><i className="fas fa-copy"></i></button>
                    <button className="ak-icon-btn" onClick={startTasbeehForCurrent} aria-label="تسبيح"><i className="fas fa-pray"></i></button>
                  </div>
                  {current.ref && <div className="ak-ref">{current.ref}</div>}
                </div>
                <div className="ak-nav">
                  <button className="ak-nav-btn" onClick={goPrev} disabled={idx === 0} aria-label="السابق">
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  <div className="ak-dots">
                    {duas.map((_, i) => (
                      <span key={i} className={`ak-dot ${i === idx ? 'active' : ''}`}></span>
                    ))}
                  </div>
                  <button className="ak-nav-btn" onClick={goNext} disabled={idx >= duas.length - 1} aria-label="التالي">
                    <i className="fas fa-chevron-left"></i>
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
