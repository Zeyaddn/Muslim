export default function Offline() {
  return (
    <div className="offline-page">
      <div className="offline-card">
        <div className="offline-icon">
          <i className="fas fa-wifi"></i>
          <span className="offline-slash"></span>
        </div>
        <h1>لا يوجد اتصال بالإنترنت</h1>
        <p>
          يبدو أنك غير متصل حالياً. بعض المحتوى المحفوظ مسبقاً لا يزال متاحاً
          عند العودة إلى الصفحة الرئيسية، أما باقي الأقسام فستعمل فور عودة الاتصال بإذن الله.
        </p>
        <button className="offline-retry" onClick={() => { window.location.href = '/'; }}>
          <i className="fas fa-house"></i> العودة للرئيسية
        </button>
        <button className="offline-refresh" onClick={() => window.location.reload()}>
          <i className="fas fa-rotate-right"></i> إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
