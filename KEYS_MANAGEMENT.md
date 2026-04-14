# 🔑 Project Update & Signing Keys (The Marketing Solution)

> [!IMPORTANT]
> **This file is the ultimate reference for your "Lock and Key" (Public and Private Keys). Do NOT change these unless you intend to break auto-updates for existing users.**

## 1. Current Golden Keys (Production)
These keys are synchronized starting from **v0.1.7** onwards.

- **Public Key (The Lock):** 
  `RWSF/+NoH8Q1iRMRDi26SZW2LhBssWWoLbTQaFUNONSZUsasHInsUv0q`
  *(Stored in `apps/admin/src-tauri/tauri.conf.json`)*

- **Private Key Path (The Key):**
  `apps/admin/admin_tauri.key`

- **Key ID:** `8935C41F68E3FF85`

---

## 2. How to Sign & Upload New Versions
Whenever you release a new version (e.g., 0.1.7), follow these steps:

1. **Build & Sign:**
   Run the following command from `apps/admin`:
   ```bash
   pnpm run build-signed
   ```
   This will use `admin_tauri.key` to generate `.sig` files.

2. **Upload to Admin Panel:**
   - Upload the generated EXE/MSI.
   - **IMPORTANT:** Open the `.sig` file in a text editor (it has 4 lines).
   - **PASTE THE ENTIRE 4-LINE CONTENT** into the "Update Signature" field in the Admin Panel. 
   - Tauri v2 requires the full Minisign format (untrusted comments and all), not just the base64 string.

---

## 3. History of Key Changes (Why it broke)
- **v0.1.6:** Was accidentally compiled with an incorrect base64-encoded public key (`UldSC...`). This causes a "Signature decoding" error in the app.
- **April 14, 2026 (FINAL FIX):** Keys were correctly synchronized with the `admin_tauri.key`. **Users on v0.1.6 MUST manually download and install v0.1.7 (or newer) to receive future auto-updates.**

---

## 4. Troubleshooting
### Error: "The signature ... could not be decoded"
This happens when:
1. The **Public Key** in `tauri.conf.json` is not in the plain `RWSF...` format.
2. The **Signature** in the Admin Panel is not the full 4-line content of the `.sig` file.

### Error: "Update failed: undefined"
Usually means the version number on the server (e.g., `0.1.7`) is exactly the same as the installed app version. The updater only triggers if `ServerVersion > LocalVersion`.

> [!CAUTION]
> If you ever lose `admin_tauri.key`, you will lose the ability to auto-update your current users. Keep a secure backup of this file outside of the project.

