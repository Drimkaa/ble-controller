"use client";

import { useRef, useState } from "react";
import { useTranslations } from 'next-intl';
import type { Color } from "../../lib/bleClient";

type Props = {
    colors: Color[];
    maxColors?: number;
    onChange: (colors: Color[]) => void;
};

function rgbToHex(r: number, g: number, b: number) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string): Color {
    return [
        parseInt(hex.substring(1, 3), 16),
        parseInt(hex.substring(3, 5), 16),
        parseInt(hex.substring(5, 7), 16),
    ];
}

function isIOS() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    // MSStream is only present in IE/Edge, not in iOS browsers
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && typeof (window as any).MSStream === 'undefined';
}

export default function ColorCircles({ colors, maxColors = 10, onChange }: Props) {
    const t = useTranslations();
    const pickerRef = useRef<HTMLInputElement>(null);
    const editingIdx = useRef<number | null>(null);
    const [showIOSPicker, setShowIOSPicker] = useState<{ idx: number, value: string } | null>(null);

    const handleCircleClick = (idx: number) => {
        editingIdx.current = idx;
        if (isIOS()) {
            setShowIOSPicker({ idx, value: rgbToHex(...colors[idx]) });
        } else if (pickerRef.current) {
            pickerRef.current.value = rgbToHex(...colors[idx]);
            pickerRef.current.click();
        }
    };

    const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const idx = editingIdx.current;
        if (idx === null) return;
        const next = [...colors];
        next[idx] = hexToRgb(e.target.value);
        onChange(next);
    };

    const handleIOSPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!showIOSPicker) return;
        const next = [...colors];
        next[showIOSPicker.idx] = hexToRgb(e.target.value);
        onChange(next);
        setShowIOSPicker(null);
    };

    const handleAdd = () => {
        if (colors.length >= maxColors) return;
        editingIdx.current = colors.length;
        // add a white color, then immediately open picker
        const next = [...colors, [255, 255, 255] as Color];
        onChange(next);
        // Small timeout so DOM updates with the new circle
        setTimeout(() => {
            if (pickerRef.current) {
                pickerRef.current.value = "#ffffff";
                pickerRef.current.click();
            }
        }, 50);
    };

    const handleRemove = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (colors.length <= 1) return;
        onChange(colors.filter((_, i) => i !== idx));
    };

    return (
        <div className="color-circles">
            {/* Hidden native color picker */}
            <input
                ref={pickerRef}
                type="color"
                className="color-picker-hidden"
                onChange={handlePickerChange}
                tabIndex={-1}
            />
            {/* iOS fallback color picker */}
            {showIOSPicker && (
                <div className="ios-color-picker-modal">
                    <div className="ios-color-picker-backdrop" onClick={() => setShowIOSPicker(null)} />
                    <div className="ios-color-picker-dialog">
                        <input
                            type="color"
                            value={showIOSPicker.value}
                            onChange={handleIOSPickerChange}
                            autoFocus
                        />
                        <button className="btn btn-ghost" onClick={() => setShowIOSPicker(null)}>{t('common.cancel')}</button>
                    </div>
                </div>
            )}

            <div className="color-circles-row">
                {colors.map((c, i) => (
                    <div key={i} className="color-circle-wrap">
                        <button
                            className="color-circle"
                            style={{ background: rgbToHex(...c) }}
                            onClick={() => handleCircleClick(i)}
                            title={t('editor.colors.clickToEdit', { index: i + 1 })}
                        >
                            <span className="color-circle-glow" style={{ background: rgbToHex(...c) }} />
                        </button>
                        {colors.length > 1 && (
                            <button
                                className="color-circle-remove"
                                onClick={(e) => handleRemove(i, e)}
                                title="Remove"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {colors.length < maxColors && (
                    <button className="color-circle add" onClick={handleAdd} title={t('editor.colors.addColor')}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                )}

                {/* Empty placeholders */}
                {Array.from({ length: Math.max(0, maxColors - Math.max(colors.length, 1) - 1) }).map((_, i) => (
                    <div key={`empty-${i}`} className="color-circle empty" />
                ))}
            </div>

            <p className="color-circles-count">
                {colors.length} / {maxColors}
            </p>
        </div>
    );
}
