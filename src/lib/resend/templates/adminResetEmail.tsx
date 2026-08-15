import * as React from 'react';

interface AdminResetEmailProps {
  resetLink: string;
  expiryMinutes?: number;
}

/**
 * Premium email template for Shreengar administrative password recovery.
 * Designed with a luxury Indian traditional aesthetics palette: deep crimson/burgundy (#8A1538) and warm gold (#D4AF37).
 */
export const AdminResetEmail: React.FC<Readonly<AdminResetEmailProps>> = ({
  resetLink,
  expiryMinutes = 15,
}) => {
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Brand Header */}
        <div style={headerStyle}>
          <div style={logoStyle}>SHREENGAR</div>
          <div style={logoSubStyle}>THE ELEGANCE OF TRADITION</div>
        </div>

        {/* Divider */}
        <hr style={dividerStyle} />

        {/* Content */}
        <h1 style={titleStyle}>Reset Administrative Password</h1>
        <p style={textStyle}>
          Hello,
        </p>
        <p style={textStyle}>
          We received a request to reset your Shreengar administrative account password. Click the link below to set a new password. This recovery link is valid for the next <strong>{expiryMinutes} minutes</strong> and can only be used once.
        </p>

        {/* Action Button */}
        <div style={buttonWrapperStyle}>
          <a href={resetLink} style={buttonStyle}>
            Reset Password
          </a>
        </div>

        <p style={linkTextStyle}>
          If the button above does not work, copy and paste the following URL into your browser:
          <br />
          <span style={urlStyle}>{resetLink}</span>
        </p>

        <p style={warningTextStyle}>
          If you did not request this password reset, please ignore this email. Your password will remain unchanged and your account remains secure.
        </p>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <p style={footerTextStyle}>
          &copy; {new Date().getFullYear()} Shreengar. All rights reserved.
        </p>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  backgroundColor: '#F9F6F0',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: '40px 20px',
  minHeight: '100%',
  width: '100%',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #EAE6DF',
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 32px',
  boxShadow: '0 4px 20px rgba(138, 21, 56, 0.05)',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const logoStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#8A1538',
  letterSpacing: '3px',
  fontFamily: "'Georgia', serif",
  margin: '0',
};

const logoSubStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: '600',
  color: '#D4AF37',
  letterSpacing: '4px',
  marginTop: '6px',
  textTransform: 'uppercase',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #F0ECE6',
  margin: '24px 0',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#1A1A1A',
  textAlign: 'center',
  marginBottom: '20px',
};

const textStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#4A4A4A',
  margin: '0 0 16px 0',
};

const buttonWrapperStyle: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#8A1538',
  color: '#ffffff',
  padding: '14px 28px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  borderRadius: '8px',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(138, 21, 56, 0.15)',
};

const linkTextStyle: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#666666',
  margin: '24px 0',
  wordBreak: 'break-all',
};

const urlStyle: React.CSSProperties = {
  color: '#8A1538',
  fontSize: '12px',
};

const warningTextStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: '#888888',
  margin: '24px 0 0 0',
  textAlign: 'center',
};

const footerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '24px 0 0 0',
  textAlign: 'center',
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 0 8px 0',
  lineHeight: '18px',
};
