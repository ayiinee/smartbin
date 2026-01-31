import logoSmartbin from '../assets/logo-smartbin.png';

const SmartbinLogo = ({ className = '', alt = 'SmartBin logo' }) => {
  const classes = ['rounded-full', 'object-cover', className].filter(Boolean).join(' ');

  return (
    <img
      src={logoSmartbin}
      alt={alt}
      className={classes}
      style={{ borderRadius: '50%' }}
    />
  );
};

export default SmartbinLogo;
