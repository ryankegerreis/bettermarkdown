# Releasing bettermarkdown

Tagged releases are built by `.github/workflows/release.yml`. The workflow
creates a draft GitHub Release containing a universal macOS DMG, a Windows NSIS
installer, Linux AppImage and Debian packages, signed updater artifacts, and
`latest.json` for the in-app updater.

## One-time setup

The updater public key is committed in `src-tauri/tauri.conf.json`. Its private
key was generated at `~/.tauri/bettermarkdown.key`; it is not part of the
repository. Back it up in a secure credential store. Losing it prevents future
versions from updating existing installations.

Add the private key to GitHub Actions:

```sh
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/bettermarkdown.key
```

The key currently has no password. If it is replaced with a password-protected
key, also set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` and update the committed
public key before publishing any build signed by the replacement.

For macOS signing and notarization, configure these repository secrets:

- `APPLE_CERTIFICATE`: base64-encoded Developer ID Application certificate
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the certificate
- `APPLE_ID`: the Apple account used for notarization
- `APPLE_PASSWORD`: an app-specific password for that account
- `APPLE_TEAM_ID`: the Apple Developer team ID

The workflow intentionally leaves Windows installers unsigned. Azure Trusted
Signing is the follow-up path; the workflow contains the corresponding TODO.

## Publish a version

Keep the same semantic version in `package.json`, `src-tauri/Cargo.toml`, and
`src-tauri/tauri.conf.json`. Commit the version change on `main`, then create and
push the matching tag:

```sh
git tag v0.2.0
git push origin main v0.2.0
```

Watch the Release workflow. It creates a draft, so download and smoke-test each
artifact before publishing it. Verify that a Markdown file opens through the OS
file association and that an older signed build offers the new version.

Publishing the draft makes it the repository's latest release. Only then does
`https://github.com/ryankegerreis/bettermarkdown/releases/latest/download/latest.json`
serve it to installed apps.

The updater signature key is separate from Apple code signing. Never rotate the
updater key casually: installed clients trust the public key embedded when they
were built.
