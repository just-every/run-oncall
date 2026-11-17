# Plan

Author: Run Edit Run fleet, 17 November 2026.

1. Read the launcher and repository instructions, the portability CLI and existing verification plan.
2. Replace the cookie-value character range with explicit RFC 6265 cookie-octet ranges, preserving ordinary session cookies while refusing comma and backslash.
3. Add one bounded CLI integration journey using a real loopback HTTP endpoint and synthetic session files. Prove valid cookie bytes are forwarded unchanged and invalid cookie bytes fail before any HTTP request.
4. Run that journey and the repository typecheck, refresh the source lock last, and check it. Leave contract judgments and generated views unchanged.
5. Commit with fleet identity, synchronize with main, scan the exact committed tree with Base's packaged publication scanner, and push only cloud/gr-mt-oncall-code-1 if the scan is COMPLETE/PASS with zero findings.
6. Inspect exact-SHA Verify within the ten-call API budget and 300-second polling interval. Save actual results and receipts, publish the selected report packet only to evidence/gr-mt-oncall-code-1, and return the required lane relay and final custody status.
