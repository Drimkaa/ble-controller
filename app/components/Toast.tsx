"use client";

import { useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { clearError } from "../../store/bleSlice";

const ERROR_MAP: Record<string, string> = {
    "Connection failed.": "errors.connectionFailed",
    "Write failed.": "errors.writeFailed",
    "Failed to edit zone.": "errors.failedToEditZone",
    "Failed to set zone mode.": "errors.failedToSetZoneMode",
    "Failed to clear zone mode.": "errors.failedToClearZoneMode",
};

export default function Toast() {
    const t = useTranslations();
    const { error } = useAppSelector((s) => s.ble);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                dispatch(clearError());
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [error, dispatch]);

    if (!error) return null;

    // Translate known error messages
    const errorKey = ERROR_MAP[error];
    const displayError = errorKey ? t(errorKey) : error;

    return (
        <div className="toast-container">
            <div className="toast toast-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{displayError}</span>
                <button 
                    className="toast-close"
                    onClick={() => dispatch(clearError())}
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
        </div>
    );
}
