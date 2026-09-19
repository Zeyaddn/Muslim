import { Component } from 'react';

// Catches render/hydration errors and shows the real message on screen
// (instead of Next's generic "Application error" page), plus a banner for
// async/unhandled errors. Helps diagnose device-specific crashes.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, asyncError: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try { console.error('APP_RENDER_ERROR', error, info); } catch {}
  }

  componentDidMount() {
    const onError = (e) => {
      try {
        const from = e.filename || '';
        if (from && typeof window !== 'undefined' && !from.startsWith(window.location.origin)) return;
        const msg = e.message || (e.error && e.error.message) || 'unknown error';
        this.setState({ asyncError: String(msg) });
      } catch {}
    };
    const onRejection = (e) => {
      try {
        const r = e.reason;
        this.setState({ asyncError: String((r && (r.message || r)) || 'unhandled rejection') });
      } catch {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    this._onError = onError;
    this._onRejection = onRejection;
  }

  componentWillUnmount() {
    window.removeEventListener('error', this._onError);
    window.removeEventListener('unhandledrejection', this._onRejection);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, direction: 'rtl' }}>
          <div style={{ maxWidth: 600, width: '100%', background: '#fff', border: '1px solid #e4e0d8', borderRadius: 16, padding: 22, textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,.08)' }}>
            <h2 style={{ margin: '0 0 8px', color: '#0f452e' }}>حدث خطأ غير متوقع</h2>
            <p style={{ color: '#5a6a64', margin: '0 0 14px' }}>أعد تحميل الصفحة للمتابعة، وإن تكرر الخطأ أرسل النص التالي:</p>
            <pre style={{ textAlign: 'left', direction: 'ltr', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: '#f7f7f7', borderRadius: 10, padding: 12, maxHeight: 260, overflow: 'auto' }}>
{String(e && (e.stack || e.message || e))}
            </pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: 16, background: '#1a6b4a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 16, cursor: 'pointer' }}>
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {this.props.children}
        {this.state.asyncError && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2147483647, background: '#b3261e', color: '#fff', padding: '10px 44px 10px 14px', fontSize: 13, direction: 'ltr', textAlign: 'left', wordBreak: 'break-word' }}>
            {this.state.asyncError}
            <button onClick={() => this.setState({ asyncError: null })} style={{ position: 'absolute', top: 6, right: 8, background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        )}
      </>
    );
  }
}
