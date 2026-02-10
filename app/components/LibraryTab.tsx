"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setZoneMode } from "../../store/bleSlice";
import {
    getSavedModes,
    deleteMode,
    type SavedMode,
} from "../../lib/storage";
import ModePreview from "./ModePreview";
import CustomSelect from "./CustomSelect";

function rgbToHex(r: number, g: number, b: number) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export default function LibraryTab() {
    const t = useTranslations();
    const dispatch = useAppDispatch();
    const { zones, isConnected } = useAppSelector((s) => s.ble);

    const [modes, setModes] = useState<SavedMode[]>([]);
    const [applyingMode, setApplyingMode] = useState<SavedMode | null>(null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);

    const activeZones = zones.filter((z) => z.isActive);

    useEffect(() => {
        setModes(getSavedModes());
    }, []);

    const handleDelete = (id: string) => {
        deleteMode(id);
        setModes(getSavedModes());
    };

    const handleApply = (mode: SavedMode) => {
        if (!isConnected || activeZones.length === 0) return;

        // If only one active zone, apply immediately
        if (activeZones.length === 1) {
            dispatch(setZoneMode({
                zoneKey: activeZones[0].key,
                type: mode.type,
                speed: mode.speed,
                colors: mode.colors,
            }));
            return;
        }

        // If multiple active zones, show zone selector
        setApplyingMode(mode);
        setSelectedZone(null);
    };

    const handleConfirmApply = () => {
        if (!applyingMode || !selectedZone) return;
        
        dispatch(setZoneMode({
            zoneKey: selectedZone,
            type: applyingMode.type,
            speed: applyingMode.speed,
            colors: applyingMode.colors,
        }));

        setApplyingMode(null);
        setSelectedZone(null);
    };

    const handleCancelApply = () => {
        setApplyingMode(null);
        setSelectedZone(null);
    };

    return (
        <div className="tab-content">
            <div className="card-glass">
                <h3 className="card-title mb-1">{t('library.title')}</h3>
                <p className="text-muted text-sm mb-4">
                    {activeZones.length === 0 && t('library.noModes')}
                    {activeZones.length === 1 && ` ${t('library.applyTo')}: ${activeZones[0].name}`}
                    {activeZones.length > 1 && ` ${t('library.multiApply', { count: activeZones.length })}`}
                </p>

                {modes.length === 0 ? (
                    <div className="empty-state-sm">
                        <p className="text-muted">
                            {t('library.noModes')}
                        </p>
                    </div>
                ) : (
                    <div className="library-grid">
                        {modes.map((mode) => (
                            <div key={mode.id} className="library-card">
                                <div className="library-card-header">
                                    <h4>{mode.name}</h4>
                                    <span className="badge-type">{t(`library.mode.${mode.type}`)}</span>
                                </div>

                                {/* Preview */}
                                <div className="library-card-preview">
                                    <ModePreview
                                        type={mode.type}
                                        speed={mode.speed}
                                        colors={mode.colors}
                                        width={240}
                                        height={28}
                                    />
                                </div>

                                {/* Color swatches */}
                                <div className="library-card-colors">
                                    {mode.colors.map((c, i) => (
                                        <span
                                            key={i}
                                            className="library-swatch"
                                            style={{ background: rgbToHex(...c) }}
                                        />
                                    ))}
                                    {mode.speed > 0 && (
                                        <span className="text-xs text-muted ml-auto">
                                            Speed: {mode.speed}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="library-card-actions">
                                    <button
                                        className="btn btn-primary btn-sm flex-1"
                                        onClick={() => handleApply(mode)}
                                        disabled={!isConnected || activeZones.length === 0}
                                    >
                                        {t('library.apply')}
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleDelete(mode.id)}
                                        title={t('library.delete')}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Zone Selector Modal */}
            {applyingMode && (
                <div className="modal-overlay" onClick={handleCancelApply}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">{t('library.selectZone')}</h3>
                        <p className="text-muted text-sm mb-4">
                            {t('library.applyTo')} "{applyingMode.name}"?
                        </p>

                        <CustomSelect
                            value={selectedZone}
                            options={activeZones.map((z) => ({
                                value: z.key,
                                label: `${z.name} (LEDs ${z.start}–${z.end})`,
                            }))}
                            onChange={setSelectedZone}
                            placeholder={t('library.selectZonePlaceholder')}
                        />

                        <div className="modal-actions">
                            <button
                                className="btn btn-ghost flex-1"
                                onClick={handleCancelApply}
                            >
                                {t('library.cancel')}
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleConfirmApply}
                                disabled={!selectedZone}
                            >
                                {t('library.apply')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
