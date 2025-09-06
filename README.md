# remote-debug-screenshot

A tiny React component that adds a floating bottom-right "Debug Screenshot" button to your app. One click captures the whole page/tab and uploads it to a server endpoint for debugging purposes.

- Primary capture: `getDisplayMedia` (whole tab), when supported
- Fallback: `html2canvas` (full page render) with iOS/WebKit size clamping and optional downscale
- No extra build tooling required — consume the package as source in a monorepo or publish it as-is

## Installation

Monorepo local (recommended during development):

```json
{
  "dependencies": {
    "remote-debug-screenshot": "file:../qr-debug-screenshot"
  }
}
```

or, after publishing to a registry:

```bash
npm i remote-debug-screenshot
```

Peer deps:
- react >= 18
- react-dom >= 18

## Usage

```tsx
import { DebugScreenshotButton } from 'remote-debug-screenshot';

export default function App() {
  return (
    <>
      {/* ... your app ... */}
      <DebugScreenshotButton
        uploadUrl="/upload-screenshot"
        source="qr-scanner-client"
        componentName="DebugScreenshot"
        notePrefix="Whole-page screenshot"
        size={56}
        tooltip="Debug Screenshot"
      />
    </>
  );
}
```

The button appears bottom-right, floating above your UI. Click it to capture and POST to `uploadUrl`.

## Server endpoint

Expected payload (JSON):

```json
{
  "clientId": "client_...",
  "source": "qr-scanner-client",
  "component": "DebugScreenshot",
  "note": "Whole-page screenshot via ...",
  "dataURL": "data:image/jpeg;base64,..."
}
```

The endpoint should decode the Base64 image and save it. In a Vite dev server, you can set up a middleware like:

```ts
server.middlewares.use('/upload-screenshot', (req, res, next) => { /* ... */ });
```

## Props

- `uploadUrl` (string): URL to POST the screenshot. Default: `/upload-screenshot`.
- `clientId` (string): Provide your own client/session id. Default: generated and stored in sessionStorage.
- `source` (string): Logical source. Default: `qr-debug-screenshot`.
- `componentName` (string): Logical component name. Default: `DebugScreenshotButton`.
- `notePrefix` (string): Prefix for the note field. Default: `Whole-page screenshot`.
- `size` (number): Button diameter (px). Default: `56`.
- `tooltip` (string): Tooltip/ARIA label. Default: `Debug Screenshot`.
- `style` (React.CSSProperties): Inline style overrides for the button container.
- `onUploadStart` / `onUploadSuccess` / `onUploadError`: Optional hooks.

## Behavior and limitations

- On browsers without `getDisplayMedia` (e.g., iOS Chrome), the fallback uses `html2canvas` which renders DOM to canvas. Videos/iframes/cross-origin content may not render identically.
- Large pages on iOS/WebKit are clamped (~16384px). The component downsamples and annotates the note with TRUNCATED info.
- The component intentionally does not show visible progress text to avoid polluting the captured image.

## Security

- For development only. Do not expose the upload endpoint publicly without authentication and rate limiting.
- Use HTTPS origins; many browsers block media capture on insecure contexts.

## Styling

- The button is a circular, frosted-glass style container with a small camera-like SVG. Override via the `style` prop if desired.

## Development (local link workflow)

When working in a monorepo alongside a consumer app (e.g., `qr-scanner-client/`), you can use `npm link` for rapid iteration without publishing:

```bash
# In this package (remote-debug-screenshot/)
npm run build
npm link

# In the consumer app (qr-scanner-client/)
npm link remote-debug-screenshot

# Start the consumer app
npm run dev
```

To unlink and go back to the registry version inside the consumer app:

```bash
# In qr-scanner-client/
npm unlink remote-debug-screenshot && npm i
```

Tip: You can add helper scripts in the consumer app's `package.json`:

```json
{
  "scripts": {
    "link:dev": "npm link remote-debug-screenshot",
    "unlink:dev": "npm unlink remote-debug-screenshot && npm i"
  }
}
```

## Publishing

This package is configured to publish compiled artifacts from `dist/` and mark the package as public.

Steps to publish a new version:

```bash
# 1) Bump version (choose patch/minor/major)
npm version patch

# 2) Build artifacts
npm run build

# 3) Publish to registry (requires prior npm login)
npm publish --access public
```

After publishing, consumers can install/update via:

```bash
npm i remote-debug-screenshot@latest
```

## License

MIT
