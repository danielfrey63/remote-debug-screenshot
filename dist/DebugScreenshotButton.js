import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useState } from 'react';
// Minimal client id generation scoped to this lib to avoid cross-package coupling
function getOrCreateClientId() {
    try {
        const k = 'qr_debug_client_id';
        const existing = sessionStorage.getItem(k);
        if (existing)
            return existing;
        const fresh = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem(k, fresh);
        return fresh;
    }
    catch {
        return `client_${Date.now()}`;
    }
}
function DebugIcon({ playing }) {
    // A simple camera-bug style icon
    return (_jsxs("svg", { viewBox: "0 0 24 24", width: "100%", height: "100%", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "12", r: "7", fill: playing ? '#0ea5e9' : '#6366f1', opacity: "0.15" }), _jsx("rect", { x: "6", y: "8", width: "12", height: "8", rx: "2", fill: "none", stroke: "#e5e7eb", strokeWidth: "1.5" }), _jsx("circle", { cx: "12", cy: "12", r: "2.5", fill: "none", stroke: "#e5e7eb", strokeWidth: "1.5" }), _jsx("path", { d: "M18 9l2-1.5v9L18 15", fill: "none", stroke: "#e5e7eb", strokeWidth: "1.5" })] }));
}
async function loadHtml2Canvas() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window;
    if (w.html2canvas)
        return w.html2canvas;
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('html2canvas CDN failed to load'));
        document.head.appendChild(script);
    });
    if (!w.html2canvas)
        throw new Error('html2canvas not available after loading script');
    return w.html2canvas;
}
export const DebugScreenshotButton = ({ uploadUrl = '/upload-screenshot', clientId, source = 'qr-debug-screenshot', componentName = 'DebugScreenshotButton', notePrefix = 'Whole-page screenshot', size = 56, tooltip = 'Debug Screenshot', style, onUploadStart, onUploadSuccess, onUploadError, }) => {
    const [busy, setBusy] = useState(false);
    const cid = useMemo(() => clientId || getOrCreateClientId(), [clientId]);
    const upload = useCallback(async (dataURL, note) => {
        setBusy(true);
        onUploadStart === null || onUploadStart === void 0 ? void 0 : onUploadStart();
        try {
            const payload = { clientId: cid, source, component: componentName, note, dataURL };
            const resp = await fetch(uploadUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`Upload failed: ${resp.status} ${txt}`);
            }
            onUploadSuccess === null || onUploadSuccess === void 0 ? void 0 : onUploadSuccess();
        }
        catch (e) {
            onUploadError === null || onUploadError === void 0 ? void 0 : onUploadError(e);
        }
        finally {
            setBusy(false);
        }
    }, [cid, componentName, onUploadError, onUploadStart, onUploadSuccess, source, uploadUrl]);
    const handleClick = useCallback(async () => {
        if (busy)
            return;
        // Preferred: getDisplayMedia if available
        const canDisplayCapture = 'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices;
        if (canDisplayCapture) {
            let stream = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
                const videoEl = document.createElement('video');
                videoEl.srcObject = stream;
                await videoEl.play();
                await new Promise((resolve) => {
                    if (videoEl.readyState >= 2)
                        return resolve();
                    videoEl.onloadedmetadata = () => resolve();
                });
                const width = videoEl.videoWidth;
                const height = videoEl.videoHeight;
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx)
                    throw new Error('Canvas 2D context unavailable.');
                ctx.drawImage(videoEl, 0, 0, width, height);
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                await upload(dataURL, `${notePrefix} via getDisplayMedia`);
            }
            catch (e) {
                onUploadError === null || onUploadError === void 0 ? void 0 : onUploadError(e);
            }
            finally {
                try {
                    if (stream)
                        stream.getTracks().forEach(t => t.stop());
                }
                catch { }
            }
            return;
        }
        // Fallback: html2canvas
        try {
            const html2canvas = await loadHtml2Canvas();
            const fullWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, document.documentElement.clientWidth);
            const fullHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, document.documentElement.clientHeight);
            const MAX_DIM = 16384;
            const targetWidth = Math.min(fullWidth, MAX_DIM);
            const targetHeight = Math.min(fullHeight, MAX_DIM);
            const truncated = targetWidth < fullWidth || targetHeight < fullHeight;
            const canvas = await html2canvas(document.documentElement, {
                useCORS: true,
                logging: false,
                backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
                windowWidth: fullWidth,
                windowHeight: fullHeight,
                scrollX: 0,
                scrollY: 0,
                scale: 1,
            });
            let output = canvas;
            if (canvas.width > targetWidth || canvas.height > targetHeight) {
                const safe = document.createElement('canvas');
                safe.width = targetWidth;
                safe.height = targetHeight;
                const sctx = safe.getContext('2d');
                if (!sctx)
                    throw new Error('Canvas 2D context unavailable (downscale).');
                sctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
                output = safe;
            }
            const dataURL = output.toDataURL('image/jpeg', 0.9);
            const note = truncated
                ? `${notePrefix} via html2canvas (TRUNCATED to ${targetWidth}x${targetHeight} of ${fullWidth}x${fullHeight})`
                : `${notePrefix} via html2canvas (${fullWidth}x${fullHeight})`;
            await upload(dataURL, note);
        }
        catch (e) {
            onUploadError === null || onUploadError === void 0 ? void 0 : onUploadError(e);
        }
    }, [busy, notePrefix, onUploadError, upload]);
    const buttonStyle = {
        position: 'fixed',
        right: 12,
        bottom: 12,
        width: size,
        height: size,
        borderRadius: '9999px',
        background: busy ? 'rgba(99,102,241,0.25)' : 'rgba(2,6,23,0.75)',
        border: '1px solid rgba(148,163,184,0.35)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        color: '#e5e7eb',
        backdropFilter: 'blur(4px)',
        cursor: busy ? 'not-allowed' : 'pointer',
        zIndex: 9999,
        ...style,
    };
    return (_jsx("button", { type: "button", "aria-label": tooltip, title: tooltip, onClick: handleClick, disabled: busy, style: buttonStyle, children: _jsx(DebugIcon, { playing: !busy }) }));
};
export default DebugScreenshotButton;
