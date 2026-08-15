<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Shreengar Project Testing Restrictions

- **Code-Audit Mode Only**: Work only in code-audit mode. Do not attempt to log in to customer or admin accounts, enter or read OTPs, reset or generate passwords, or modify Supabase Auth users or OTP tables.
- **No Browser Automation on Authenticated Pages**: Do not use browser automation or opening of password reset links.
- **Reporting Rule**: For any feature requiring authentication or browser interaction, report: "Manual authenticated testing must be performed by the user."
- **Testing**: Use mocks or isolated unit tests only. Do not use real admin credentials.

