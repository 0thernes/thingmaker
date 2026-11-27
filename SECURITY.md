# Security Policy

## Reporting a Vulnerability
Please report security issues privately by emailing `0_0@0thernes.art` with steps to reproduce.

## Security Posture
- `index.html` executes entirely client-side with zero external network requests, zero third-party scripts, zero analytics, and zero backend storage.
- User-supplied seed strings and exported SVG/HTML content must be escaped safely before DOM insertion.
- Supported version: latest commit on `main` (`v2.1.0`).
