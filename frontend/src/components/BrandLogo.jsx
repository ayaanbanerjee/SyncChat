import './BrandLogo.css';

const BrandLogo = ({ compact = false, className = '' }) => (
  <span className={`brand-logo ${compact ? 'brand-logo-compact' : ''} ${className}`}>
    <svg className="brand-logo-symbol" viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="chatSyncGradient" x1="3" y1="3" x2="29" y2="29"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#5b5ce8"/></linearGradient></defs>
      <path fill="url(#chatSyncGradient)" d="M5 5.5A5.5 5.5 0 0 1 10.5 0h11A5.5 5.5 0 0 1 27 5.5v10A5.5 5.5 0 0 1 21.5 21H14l-5.7 5.2c-1.2 1.1-3.3.3-3.3-1.4V21A5.5 5.5 0 0 1 0 15.5v-10A5.5 5.5 0 0 1 5 0Z" transform="translate(2.5 2.5) scale(.8)"/>
      <path fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.2" d="M10 16h12M10 11.5h7"/>
    </svg>
    {!compact && <span>Sync<span>Chat</span></span>}
  </span>
);

export default BrandLogo;
