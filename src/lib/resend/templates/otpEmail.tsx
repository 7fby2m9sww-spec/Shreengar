import * as React from 'react';

interface OtpEmailProps {
  otp: string;
  expiryMinutes?: number;
}

/**
 * Premium email template for Shreengar custom OTP authentication.
 * Designed with a luxury Indian traditional aesthetics palette: deep crimson/burgundy (#8A1538) and warm gold (#D4AF37).
 */
export const OtpEmail: React.FC<Readonly<OtpEmailProps>> = ({
  otp,
  expiryMinutes = 5,
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
        <h1 style={titleStyle}>Verify Your Email</h1>
        <p style={textStyle}>
          Hello,
        </p>
        <p style={textStyle}>
          Thank you for choosing Shreengar. Please use the following one-time password (OTP) to complete your verification process. This code is valid for the next <strong>{expiryMinutes} minutes</strong>.
        </p>

        {/* OTP Code Box */}
        <div style={otpBoxStyle}>
          <div style={otpLabelStyle}>YOUR ONE-TIME PASSWORD</div>
          <div style={otpTextStyle}>{otp}</div>
        </div>

        <p style={warningTextStyle}>
          For your security, please do not share this code with anyone. Shreengar representatives will never ask for this code. If you did not request this email, you can safely ignore it.
        </p>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <p style={footerTextStyle}>
          &copy; {new Date().getFullYear()} Shreengar. All rights reserved.
        </p>
        <p style={footerTextStyle}>
          If you have any questions, please contact our customer support team.
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
  color: '#8A1538', // Deep Burgundy
  letterSpacing: '3px',
  fontFamily: "'Georgia', serif",
  margin: '0',
};

const logoSubStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: '600',
  color: '#D4AF37', // Gold
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

const otpBoxStyle: React.CSSProperties = {
  backgroundColor: '#FDFBF7',
  border: '1px dashed #D4AF37',
  borderRadius: '8px',
  padding: '24px',
  margin: '32px 0',
  textAlign: 'center',
};

const otpLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#888888',
  letterSpacing: '2px',
  marginBottom: '12px',
};

const otpTextStyle: React.CSSProperties = {
  fontSize: '36px',
  fontWeight: '700',
  color: '#8A1538',
  letterSpacing: '8px',
  fontFamily: "'Courier New', Courier, monospace",
  margin: '0',
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
