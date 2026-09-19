import ISLAMIC_DATA from '../data/islamic-data';
import { TARGETS } from '../constants';

export default function TasbeehPage({
  effectivePage, tasbeehDhikr, setTasbeehDhikr,
  tasbeehCount, setTasbeehCount, tasbeehTarget, setTasbeehTarget,
  handleTasbeeh, tasbeehProgress,
}) {
  return (
    <section className={`page-section ${effectivePage === 'tasbeeh' ? 'active' : ''}`}>
      <div className="page-header">
        <h1><i className="fas fa-pray"></i> المسبحة</h1>
        <p>سبح الله واذكره بالعدد</p>
      </div>
      <div className="page-content">
        <div className="tally-wrapper">
          <div className="tasbeeh-top">
            <select className="tasbeeh-select" value={tasbeehDhikr.id} onChange={e => { setTasbeehDhikr(ISLAMIC_DATA.tasbeehOptions.find(t => t.id === e.target.value) || ISLAMIC_DATA.tasbeehOptions[0]); setTasbeehCount(0); }}>
              {ISLAMIC_DATA.tasbeehOptions.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="tally-dhikr-text">{tasbeehDhikr.name}</div>

          <div className="tally-body">
            <div className="tally-screen-frame">
              <div className="tally-screen">
                <span className="tally-number">{String(tasbeehCount).padStart(4, '0')}</span>
              </div>
            </div>
            <button className="tally-click-btn" onClick={handleTasbeeh} aria-label="سبّح">
              <div className="tally-click-inner"></div>
            </button>
            <button className="tally-reset-btn" onClick={() => setTasbeehCount(0)} title="إعادة التصفير" aria-label="إعادة">
              <i className="fas fa-redo-alt"></i>
            </button>
          </div>

          <div className="tasbeeh-below">
            <div className="tally-targets">
              <span className="tasbeeh-target-label"><i className="fas fa-bullseye"></i> الهدف</span>
              {TARGETS.map(t => (
                <button key={t} className={`tally-target-btn ${tasbeehTarget === t ? 'active' : ''}`}
                  onClick={() => { setTasbeehTarget(t); setTasbeehCount(0); }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="tasbeeh-progress">
              <div className="tasbeeh-progress-fill" style={{ width: `${tasbeehProgress}%` }}></div>
              <span className="tasbeeh-progress-text">{Math.round(tasbeehProgress)}%</span>
            </div>
            <p className="tasbeeh-hint">
              <i className="fas fa-keyboard"></i> اضغط مفتاح المسافة للعد
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
