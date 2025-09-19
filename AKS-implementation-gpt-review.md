# AKS Implementation Plan – GPT Review

## Key Findings
1. **Frontend dependencies misaligned with Vue stack** – The plan tells engineers to install `@azure/msal-react`, but the UI is built with Vue. Keeping the React wrapper introduces unused code and confusion because the later examples never reference it. Retain `@azure/msal-browser` and document the Vue-centric service/composable pattern instead.
2. **Access-token storage description is inaccurate** – The security section claims “Tokens stored in browser localStorage with HttpOnly cookies as backup,” yet MSAL running in the browser cannot set HttpOnly cookies. In practice the token sits in Web Storage, so any XSS could exfiltrate it. Update the narrative to state the real storage location and list the mitigation controls (strict CSP, sanitized UI, dependency scanning). We agreed risk is acceptable for this project, so no server-side exchange is required—just make the trade-off explicit.
3. **Troubleshooting command will fail** – `kubectl exec -it deployment/backend …` is invalid because `exec` targets pods, not deployments. Provide a working example (e.g., resolve the pod name first or use `kubectl exec -n credit-card-processor -it $(kubectl get pod …)`), otherwise operators will hit errors during incident response.
4. **Secret management steps conflict** – Early instructions create an `azuread-auth` secret via CLI, while later manifests expect a different `app-secrets` secret with the same credentials. Following both paths will desynchronize values. Consolidate on one secret convention (or explain why two are needed) to avoid drift.

## Recommended Updates
- Replace the `npm install` guidance with `@azure/msal-browser` only and point readers to the Vue authentication service in Phase 2.
- Revise the security considerations to acknowledge localStorage token storage, enumerate compensating controls, and remove the HttpOnly cookie claim unless a future server exchange is introduced.
- Correct the `kubectl exec` troubleshooting snippet so it targets an actual pod name.
- Decide on a single Kubernetes secret for Azure AD credentials, document its lifecycle, and update the manifests/CLI steps accordingly.
- (Optional) Highlight that MSAL’s redirect + silent acquisition flow keeps authentication unobtrusive for already-signed-in users; only fall back to an interactive prompt when no cached account exists.

## Decisions & Follow-ups
- Stakeholders accept MSAL’s browser-only storage for now because the security stakes are modest; document that decision and the mitigations instead of implying HttpOnly cookies.
- Aim for a painless auth experience by initializing MSAL on load, checking cached accounts, and only triggering `loginRedirect` when required. Note this in the plan so implementers follow the pattern.
- No further action is needed on server-issued cookies unless risk tolerance changes; revisit if compliance or threat models tighten.
