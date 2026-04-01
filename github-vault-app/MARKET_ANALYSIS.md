# Market Analysis: GitHub Vault — Encrypted Files in Public Repositories

**Date:** April 2026
**Verdict:** Narrow opportunity with significant execution risk. The core value proposition -- avoiding paid GitHub plans -- has been undermined by GitHub making private repos free. Viable as a feature of SecretDrop (not standalone) if repositioned around secret leak prevention.
**Status:** Implemented as "GitHub Vault" tab within SecretDrop — client-side AES-256-GCM, browser-only, zero server dependency.

---

## 1. Competitive Landscape

### Established Tools

| Tool | Type | Encryption | Strengths | Weaknesses |
|------|------|-----------|-----------|------------|
| **git-crypt** | CLI, transparent | AES-256 / GPG | Near-invisible once configured; best git integration | No key rotation; repo-level access only; diffs are binary blobs; pre-1.0 maturity; easy to accidentally commit plaintext |
| **SOPS** (Mozilla) | CLI, manual | AES-256-GCM via GPG/KMS/age | Encrypts only values (keys stay readable); file-level ACLs; audit logging; rich CI/CD ecosystem (Flux, ArgoCD) | Not git-transparent; manual re-encryption for key rotation; steep learning curve |
| **BlackBox** (StackExchange) | CLI | GPG | Multi-VCS (Git, Hg, SVN, Perforce); one-command re-encryption; clear admin listing | GPG-only; repo-level access; binary diffs |
| **transcrypt** | CLI (bash script) | OpenSSL AES-256-CBC | Zero dependencies beyond OpenSSL/bash; per-file unique salts; supports `git diff`; easy rekey | Symmetric key only; repo-level access; OpenSSL rather than modern crypto |
| **git-secret** | CLI | GPG (AES-256-OCB) | Simple model; stores encrypted files alongside plaintext | Two-file model is messy; GPG dependency; not transparent |
| **age** | CLI library | X25519/ChaCha20-Poly1305 | Modern crypto; tiny keys; no config files; UNIX composable | Not git-integrated natively; requires wrapper tooling |
| **git-remote-gcrypt** | CLI | GPG | Encrypts entire repo contents; works with public remotes | Force-push model risks losing commits; complex setup; full-repo only |

### Browser-Based Encryption (Not Git-Integrated)

- **hat.sh** -- Client-side file encryption (XChaCha20-Poly1305), no git awareness
- **Picocrypt** -- Desktop/web encryption, archived project, 512MB limit on web
- Various single-page HTML encryption tools -- encrypt/decrypt files, zero git integration

**Key finding:** No existing tool combines a web UI with git-aware encryption workflows. Every competitor is CLI-only for the git integration layer.

---

## 2. The Core Value Proposition Problem

The original pitch assumes users want to encrypt files in **public** repos to avoid paying for private repos. This premise has a fatal flaw:

**GitHub Free tier already includes unlimited private repositories.**

Since 2019, GitHub has offered unlimited private repos on the Free plan. The Free tier (2026) includes:
- Unlimited public AND private repositories
- 2,000 Actions minutes/month
- 500MB Packages storage

The paid Team plan ($4/user/month) adds collaboration features -- required reviewers, code owners, draft PRs -- not repository privacy. Enterprise ($21/user/month) adds SSO, SCIM, audit logs.

**No one needs to encrypt files in public repos to avoid paying for private repos.** The pricing gap that this product assumes does not exist.

---

## 3. Repositioned Market Opportunities

If the "avoid paying" angle is dead, are there real use cases? Yes, but they are narrower:

### 3a. Selective Secrets in Otherwise-Public Repos
- Open-source projects that need a few encrypted config files (API keys, deploy credentials) alongside public code
- git-crypt's stated sweet spot, but git-crypt is hard to set up and has known footguns
- **Addressable pain:** Setup complexity, accidental plaintext commits, no web UI for non-technical contributors

### 3b. Secrets Sprawl is Worsening
- 28.65 million new hardcoded secrets were added to public GitHub repos in 2025 alone (34% YoY increase)
- 70% of secrets leaked in 2022 remain active today
- AI-assisted commits leak secrets at 2x the baseline rate (3.2% vs ~1.6%)
- **Addressable pain:** Prevention is easier than remediation; a frictionless encrypt-before-commit tool could reduce leaks

### 3c. Non-Technical Users in Mixed Teams
- Design teams, documentation contributors, and PMs who touch repos but cannot use CLI tools
- **Addressable pain:** No existing tool serves users who do not have a terminal open

### 3d. Encrypted Config in CI/CD Pipelines
- Teams using GitOps who want secrets versioned alongside infrastructure code
- SOPS dominates here but is complex; a simpler alternative could capture small-team market

### 3e. Cross-Platform Encrypted Storage
- Encrypted files stored in Google Drive, Dropbox, or any public link -- not just GitHub
- This broadens the TAM but dilutes the product focus

---

## 4. Market Size (Honest Assessment)

| Metric | Number | Source |
|--------|--------|--------|
| GitHub total developers | 180M+ | GitHub (2026) |
| New repos created in 2025 | 121M | GitHub Octoverse |
| Public repos (% of total) | 63% | GitHub Octoverse |
| Secrets leaked in public repos (2025) | 28.65M | GitGuardian 2026 Report |
| GitHub Copilot paid subscribers | 1.3M | Microsoft earnings |

**Realistic TAM calculation:**
- Developers with public repos containing files that should be encrypted: unknown, but the 28.65M leaked secrets suggest millions of repos have this problem
- Developers who would pay for a tool vs. use free CLI alternatives: a small fraction
- Developers who specifically need a web UI: even smaller

**Honest estimate:** The addressable market for a paid web-based tool is likely in the tens of thousands of users, not millions. Most developers who care about this already use SOPS or git-crypt (free). Most who do not care will not start caring because of a nicer UI.

---

## 5. Gaps in Existing Tools (Real Opportunities)

| Gap | Severity | Who Feels It |
|-----|----------|-------------|
| No web UI for git encryption | Medium | Non-technical team members, occasional contributors |
| Key management is painful (GPG especially) | High | Everyone; GPG is universally hated |
| No visual diff of encrypted files | Medium | Code reviewers (SOPS partially solves this) |
| No one-click setup | High | Small teams without a dedicated DevOps person |
| Accidental plaintext commit prevention | High | All git-crypt users |
| Team key sharing/rotation UX | High | Teams > 5 people |
| Cross-repo secret management | Medium | Organizations with many repos |

The strongest opportunity is around **key management UX** and **accidental plaintext prevention**. GPG is the single biggest friction point across all existing tools. A tool that eliminates GPG entirely (using age or Web Crypto API) and prevents the "committed plaintext before encryption was configured" failure mode would solve real pain.

---

## 6. Honest Risks

### Risk 1: The Market Does Not Exist as Described
Private repos are free. The stated value proposition is invalid. Repositioning is required before building anything.

### Risk 2: Security Liability
Encryption software carries enormous liability. One bug means users' secrets are exposed in public repos. Unlike a TODO app, failure here causes real damage -- leaked API keys, credentials, and private data. Users will blame the tool, not themselves.

### Risk 3: Browser-Based Crypto Trust Problem
Users must trust that a web app handles encryption correctly and does not exfiltrate keys. CLI tools have an advantage here: users can audit the code locally. A web app introduces a server operator as a potential adversary. Even client-side-only implementations face skepticism.

### Risk 4: GitHub Could Build This
GitHub already detects leaked secrets (39M found in 2024). Adding an "encrypt this file" button to their UI would be trivial and would instantly kill any third-party tool. GitHub's push into security features (Secret Scanning, Code Security at $30/committer/month) shows they are moving in this direction.

### Risk 5: Free CLI Tools Are Good Enough
SOPS and git-crypt are free, battle-tested, and well-documented. The target audience (developers) is comfortable with CLI tools. A web UI is a "nice to have," not a "must have" for most of this market.

### Risk 6: Key Loss = Data Loss
If a user loses their encryption key and their files are in a public repo, those files are permanently inaccessible. There is no recovery path. This will generate support tickets and negative reviews no matter how clearly it is documented.

### Risk 7: Encryption Encourages Bad Practices
Security professionals consistently warn against storing secrets in git repos at all, even encrypted. The recommended approach is external secret managers (Vault, AWS Secrets Manager, Infisical, Doppler). A tool that makes it easier to store secrets in git arguably moves the ecosystem in the wrong direction.

---

## 7. What Would Have to Be True for This to Work

1. **Repositioned value prop:** Not "avoid paying for private repos" but "prevent secret leaks in public repos with zero setup friction"
2. **Client-side only:** All encryption/decryption happens in the browser. No server ever sees keys or plaintext. This is non-negotiable for trust.
3. **Eliminate GPG entirely:** Use age or Web Crypto API. GPG is the #1 adoption barrier for every existing tool.
4. **GitHub App integration:** Install via GitHub Marketplace, auto-configure `.gitattributes`, intercept commits via GitHub Actions to block plaintext pushes of files that should be encrypted.
5. **Freemium model:** Free for individual use, paid for team key sharing and audit logs. Competing with free CLI tools means the basic tier must also be free.
6. **Diff support:** Show meaningful diffs of encrypted files (like SOPS does for values) to avoid the "binary blob" code review problem.
7. **Broader positioning:** Frame as "secret leak prevention" rather than "encryption tool" -- this aligns with the $30/committer GitHub Code Security pricing and justifies a price point.

---

## 8. Extended Use Cases Assessment

| Use Case | Viability | Notes |
|----------|-----------|-------|
| Encrypted files in Google Drive/Dropbox | Low | Boxcryptor, Cryptomator, and rclone crypt already serve this well |
| Encrypted CI/CD config | Medium | SOPS + Flux/ArgoCD is entrenched; hard to displace |
| Team secret sharing via git | Medium | Competes with Infisical, Doppler, 1Password -- well-funded competitors |
| Pre-commit secret leak prevention | High | Complements GitGuardian; could be a wedge feature |
| Non-technical user access to encrypted repo files | Medium | Real gap but tiny market |

---

## 9. Conclusion

**The original product idea is based on a false premise.** GitHub private repos have been free since 2019. No one needs to encrypt files in public repos to save money.

However, a **repositioned product** addressing secret leak prevention, GPG-free key management, and web-based access for non-technical team members could find a niche. The strongest version of this product would be:

- A GitHub App (not a standalone web app)
- Client-side encryption using age or Web Crypto API
- One-click setup via GitHub Marketplace
- Automatic plaintext commit blocking via GitHub Actions
- Free for individuals, $5-10/user/month for teams

Even repositioned, this is a **small market with strong free alternatives and platform risk from GitHub itself**. It could work as a bootstrapped side project but is not venture-scale. The most likely successful outcome is building it as an open-source tool with a paid hosted offering for teams -- similar to how GitGuardian monetizes secret detection.

**Recommendation:** Do not build this as originally conceived. If proceeding, validate the repositioned value proposition with 20+ potential users before writing code. The question to answer is not "would people use this?" but "would people pay for this when git-crypt and SOPS are free?"

---

## Sources

- [4 Secrets Management Tools for Git Encryption](https://opensource.com/article/19/2/secrets-management-tools-git)
- [Lightweight Secrets Management Tools for Git Encryption](https://austindewey.com/2019/01/28/lightweight-secrets-management-tools-for-git-encryption/)
- [SOPS Comprehensive Guide - GitGuardian](https://blog.gitguardian.com/a-comprehensive-guide-to-sops/)
- [transcrypt - GitHub](https://github.com/elasticdog/transcrypt)
- [age encryption tool - GitHub](https://github.com/FiloSottile/age)
- [GitHub Pricing 2026](https://github.com/pricing)
- [GitHub Statistics 2026 - Kinsta](https://kinsta.com/blog/github-statistics/)
- [GitHub Statistics 2026 - CoinLaw](https://coinlaw.io/github-statistics/)
- [State of Secrets Sprawl 2025 - GitGuardian](https://www.gitguardian.com/state-of-secrets-sprawl-report-2025)
- [GitHub Found 39M Secret Leaks in 2024](https://github.blog/security/application-security/next-evolution-github-advanced-security/)
- [hat.sh - Browser File Encryption](https://github.com/sh-dv/hat.sh)
- [git-crypt Limitations - Hacker News](https://news.ycombinator.com/item?id=7509871)
- [Handling Secrets in NixOS: git-crypt, agenix, sops-nix](https://discourse.nixos.org/t/handling-secrets-in-nixos-an-overview-git-crypt-agenix-sops-nix-and-when-to-use-them/35462)
- [Keybase Encrypted Git](https://keybase.io/blog/encrypted-git-for-everyone)
- [GitHub Pricing Changes for Actions 2026](https://resources.github.com/actions/2026-pricing-changes-for-github-actions/)
