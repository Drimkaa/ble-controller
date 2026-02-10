"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setZoneMode, clearZoneMode, setSelectedZone, getZoneDetails } from "../../store/bleSlice";
import { saveMode, getSavedModes, type SavedMode } from "../../lib/storage";
import type { Color } from "../../lib/bleClient";
import ColorCircles from "./ColorCircles";
import ModePreview from "./ModePreview";
import CustomSelect from "./CustomSelect";

const MODE_TYPES = [
    { value: "static", icon: "■" },
    { value: "fade", icon: "◑" },
    { value: "pulse", icon: "◉" },
    { value: "rainbow", icon: "🌈" },
    { value: "fire", icon: "🔥" },
];

export default function ModeEditorTab() {
    const t = useTranslations();
    const dispatch = useAppDispatch();
    const { zones, zoneNames, selectedZoneKey, selectedZoneDetails, isConnected, isLoadingZones } = useAppSelector((s) => s.ble);

    // Auto-select the only active zone if none selected
    useEffect(() => {
        if (!selectedZoneKey && zones && zones.length > 0) {
            const activeZones = zones.filter(z => z.isActive);
            if (activeZones.length === 1) {
                dispatch(setSelectedZone(activeZones[0].key));
                dispatch(getZoneDetails(activeZones[0].key));
            }
        }
    }, [selectedZoneKey, zones, dispatch]);

    const zone = selectedZoneDetails;

    const [modeType, setModeType] = useState("static");
    const [speed, setSpeed] = useState(5);
    const [colors, setColors] = useState<Color[]>([[255, 60, 0]]);
    const [allColors, setAllColors] = useState<Color[]>([[255, 60, 0]]); // Backup for multi-color modes
    const [saveName, setSaveName] = useState("");
    const [showSave, setShowSave] = useState(false);
    const [previewWidth, setPreviewWidth] = useState(360);

    useEffect(() => {
        const updatePreviewWidth = () => {
            if (typeof window === "undefined") return;
            const minWidth = 220;
            const maxWidth = 420;
            const padding = 80;
            const next = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - padding));
            setPreviewWidth(next);
        };

        updatePreviewWidth();
        window.addEventListener("resize", updatePreviewWidth);
        return () => window.removeEventListener("resize", updatePreviewWidth);
    }, []);

    // Load from zone's current mode when selecting a zone
    useEffect(() => {
        if (zone?.currentMode) {
            setModeType(zone.currentMode.type);
            setSpeed(zone.currentMode.speed);
            if (zone.currentMode.colors.length > 0) {
                setColors([...zone.currentMode.colors]);
                setAllColors([...zone.currentMode.colors]);
            }
        }
    }, [selectedZoneKey, zone]); // eslint-disable-line react-hooks/exhaustive-deps

    const isMultiColor = ["fade", "pulse", "rainbow"].includes(modeType);
    const showSpeed = ["fade", "pulse", "rainbow"].includes(modeType);

    const handleModeTypeChange = (newType: string) => {
        const wasSingleColor = modeType === "static" || modeType === "fire";
        const isSingleColor = newType === "static" || newType === "fire";

        setModeType(newType);

        if (!wasSingleColor && isSingleColor) {
            // Switching from multi-color to single-color: save all colors and show only first
            setAllColors([...colors]);
            setColors([colors[0]]);
        } else if (wasSingleColor && !isSingleColor) {
            // Switching from single-color to multi-color: restore saved colors
            if (allColors.length > 1) {
                setColors([...allColors]);
            }
        }
    };

    const handleColorsChange = (newColors: Color[]) => {
        setColors(newColors);
        // Update backup if we're in multi-color mode
        if (isMultiColor && newColors.length > 0) {
            setAllColors([...newColors]);
        }
    };

    const handleApply = () => {
        if (!zone) return;
        dispatch(setZoneMode({
            zoneKey: zone.key,
            type: modeType,
            speed,
            colors,
        }));
    };

    const handleClear = () => {
        if (!zone) return;
        dispatch(clearZoneMode(zone.key));
    };

    const handleSaveToLibrary = () => {
        if (!saveName.trim()) return;
        saveMode({ name: saveName.trim(), type: modeType, speed, colors });
        setSaveName("");
        setShowSave(false);
    };

    const loadPreset = (preset: SavedMode) => {
        setModeType(preset.type);
        setSpeed(preset.speed);
        setColors([...preset.colors]);
        setAllColors([...preset.colors]);
    };

    const handleZoneSelect = (zoneKey: string) => {
        dispatch(setSelectedZone(zoneKey));
        dispatch(getZoneDetails(zoneKey));
    };

    return (
        <div className="tab-content">
            {/* Zone Selector + Info */}
            <div className="card-glass">
                <h3 className="card-title mb-3">{t('editor.selectZone')}</h3>
                {zoneNames.length === 0 ? (
                    <p className="text-muted text-sm">
                        {isConnected ? t('editor.noZones') : t('editor.noZones')}
                    </p>
                ) : (
                    <CustomSelect
                        value={selectedZoneKey}
                        options={zoneNames.map((z) => ({
                            value: z.key,
                            label: `${z.name} ${z.isActive ? "✓" : "○"}`,
                        }))}
                        onChange={handleZoneSelect}
                        placeholder={t('editor.selectZonePlaceholder')}
                        disabled={isLoadingZones}
                    />
                )}

                {zone ? (
                    <>
                        <div className="divider-thin" />
                        <div className="flex-between">
                            <div>
                                <h3 className="card-title">{zone.name}</h3>
                                <p className="text-muted text-sm">
                                    LEDs {zone.start}–{zone.end} · {zone.isActive ? "Active" : "Inactive"}
                                </p>
                            </div>
                            <span className={`status-dot ${zone.isActive ? "on" : ""}`} />
                        </div>
                    </>
                ) : selectedZoneKey && isLoadingZones ? (
                    <>
                        <div className="divider-thin" />
                        <div className="skeleton-line" style={{ width: '40%', height: '24px', marginBottom: '12px' }} />
                        <div className="skeleton-line" style={{ width: '60%', height: '14px' }} />
                    </>
                ) : null}
            </div>

            {!zone ? (
                selectedZoneKey && isLoadingZones ? (
                    <div className="card-glass">
                        <div className="skeleton-line" style={{ width: '40%', height: '24px', marginBottom: '12px' }} />
                        <div className="skeleton-line" style={{ width: '60%', height: '14px', marginBottom: '24px' }} />
                        <div className="skeleton-line" style={{ width: '100%', height: '48px' }} />
                    </div>
                ) : (
                    <div className="card-glass empty-state">
                        <div className="empty-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18M9 21V9" />
                            </svg>
                        </div>
                        <h3>{t('editor.emptyState.title')}</h3>
                        <p className="text-muted">{t('editor.emptyState.description')}</p>
                    </div>
                )
            ) : (
                <>
                    {/* Live Preview */}
                    <div className="card-glass">
                        <h3 className="card-title mb-3">{t('editor.preview.title')}</h3>
                        <ModePreview type={modeType} speed={speed} colors={colors} width={previewWidth} height={48} />
                    </div>

                    {/* Mode Type Selector */}
                    <div className="card-glass">
                        <h3 className="card-title mb-3">{t('editor.mode.title')}</h3>
                        <div className="mode-type-grid">
                            {MODE_TYPES.map((mt) => (
                                <button
                                    key={mt.value}
                                    className={`mode-type-btn ${modeType === mt.value ? "active" : ""}`}
                                    onClick={() => handleModeTypeChange(mt.value)}
                                >
                                    <span className="mode-type-icon">{mt.icon}</span>
                                    <div className="mode-type-text">
                                        <span className="mode-type-label">{t(`editor.mode.${mt.value}`)}</span>
                                        <span className="mode-type-desc">{t(`editor.mode.${mt.value}Desc`)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="card-glass">
                        <h3 className="card-title mb-3">{t('editor.colors.title')}</h3>
                        <ColorCircles
                            colors={colors}
                            maxColors={isMultiColor ? 10 : 1}
                            onChange={handleColorsChange}
                        />
                    </div>

                    {/* Speed */}
                    {showSpeed && (
                        <div className="card-glass">
                            <h3 className="card-title mb-1">{t(`editor.speed.${modeType}`)}</h3>
                            <p className="text-muted text-sm mb-3">
                                Factor: {speed} — {speed <= 3 ? t('editor.speed.faster') : speed <= 10 ? "Medium" : t('editor.speed.slower')}
                            </p>
                            <input
                                type="range"
                                className="range-slider"
                                min={1}
                                max={50}
                                step={1}
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value))}
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="card-glass">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleApply}
                                disabled={!isConnected || !zone.isActive || isLoadingZones}
                            >
                                {t('editor.actions.apply')}
                            </button>
                            <button
                                className="btn btn-danger flex-1"
                                onClick={handleClear}
                                disabled={!isConnected || isLoadingZones}
                            >
                                {t('editor.actions.clear')}
                            </button>
                        </div>

                        <div className="divider-thin" />

                        {showSave ? (
                            <div className="flex gap-2">
                                <input
                                    className="form-input flex-1"
                                    placeholder={t('editor.saveDialog.name')}
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSaveToLibrary()}
                                />
                                <button className="btn btn-accent btn-sm" onClick={handleSaveToLibrary}>{t('editor.saveDialog.save')}</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowSave(false)}>×</button>
                            </div>
                        ) : (
                            <button
                                className="btn btn-ghost w-full"
                                onClick={() => setShowSave(true)}
                            >
                                {t('editor.actions.save')}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
