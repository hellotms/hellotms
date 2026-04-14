# 🔑 Project Update & Signing Keys (The Marketing Solution)

> [!IMPORTANT]
> **This file is the ultimate reference for your "Lock and Key" (Public and Private Keys). Do NOT change these unless you intend to break auto-updates for existing users.**

## 1. Current Golden Keys (Production)
These keys are currently synchronized with **v0.1.6** onwards.

- **Public Key (The Lock):** 
  `UldSC7aU6N7172Ddy5NXIXHPx213AMLcDoSr2mpbw6Jbb770NRV3R70BAA==`
  *(Stored in `apps/admin/src-tauri/tauri.conf.json`)*

- **Private Key Path (The Key):**
  `apps/admin/admin_tauri.key`

- **Key ID:** `0bb694e8def5ef60`

---

## 2. How to Sign New Versions
Whenever you release a new version (e.g., 0.1.7), follow these steps:

1. **Build & Sign:**
   Run the following command from `apps/admin`:
   ```bash
   pnpm run build-signed
   ```
   This will use the `admin_tauri.key` to generate `.sig` files for your EXE and MSI.

2. **Upload to Admin Panel:**
   - Upload the generated EXE from `src-tauri/target/release/bundle/nsis/`.
   - Copy the **entire** content of the `.sig` file and paste it into the "Update Signature" field in the Admin Panel.

---

## 3. History of Key Changes (Why it broke before)
- **v0.1.5 and earlier:** Used an old public key (`RWTSF/...`).
- **April 9, 2026:** Keys were regenerated but not perfectly synchronized.
- **April 14, 2026 (GOLDEN FIX):** Keys were perfectly synchronized with the `admin_tauri.key`. **User must manually install v0.1.6 to bridge this gap.**

---

## 4. Troubleshooting
If users see **"Update failed: undefined"**, it usually means:
1. The **Public Key** in your binary doesn't match the **Signature** on the server.
2. The **Version** on the server has an unnecessary `v` prefix.

> [!CAUTION]
> If you ever lose `admin_tauri.key`, you will lose the ability to auto-update your current users. Keep a secure backup of this file outside of the project as well.
