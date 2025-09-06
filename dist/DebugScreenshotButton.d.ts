import React from 'react';
export type DebugScreenshotButtonProps = {
    uploadUrl?: string;
    clientId?: string;
    source?: string;
    componentName?: string;
    notePrefix?: string;
    size?: number;
    tooltip?: string;
    style?: React.CSSProperties;
    onUploadStart?: () => void;
    onUploadSuccess?: (fileName?: string) => void;
    onUploadError?: (error: unknown) => void;
};
export declare const DebugScreenshotButton: React.FC<DebugScreenshotButtonProps>;
export default DebugScreenshotButton;
