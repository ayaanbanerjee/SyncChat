// Reusable avatar component — shows image or initials fallback
const Avatar = ({ src, name = '', size = 40 }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
  };

  if (src) {
    return <img src={src} alt={name} style={style} />;
  }

  return (
    <div
      style={{
        ...style,
        background: 'var(--accent)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
      }}
    >
      {initials || '?'}
    </div>
  );
};

export default Avatar;
