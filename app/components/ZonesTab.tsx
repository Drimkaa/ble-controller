"use client";

import { useState, useMemo } from "react";
import { useTranslations } from 'next-intl';
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    addZone,
    editZone,
    clearZoneMode,
    setError,
} from "../../store/bleSlice";
import { saveZone } from "../../lib/storage";
import ModePreview from "./ModePreview";

const NUM_LEDS = 153;

type ZoneFormData = {
    name: string;
    start: string;
    end: string;
};

export default function ZonesTab() {
    const t = useTranslations();
    const dispatch = useAppDispatch();
    const { zones, isConnected, isLoadingZones } = useAppSelector((s) => s.ble);

    const [showForm, setShowForm] = useState(false);
    const [useOccupied, setUseOccupied] = useState(false);
    const [form, setForm] = useState<ZoneFormData>({ name: "", start: "0", end: "153" });

    // Compute which pixels are occupied by active zones
    const occupiedPixels = useMemo(() => {
        const set = new Set<number>();
        zones.forEach((z) => {
            if (z.isActive) {
                for (let i = z.start; i < z.end; i++) set.add(i);
            }
        });
        return set;
    }, [zones]);

    // Find available ranges (contiguous free stretches)
    const freeRanges = useMemo(() => {
        const ranges: { start: number; end: number }[] = [];
        let rangeStart: number | null = null;
        for (let i = 0; i <= NUM_LEDS; i++) {
            if (!occupiedPixels.has(i)) {
                if (rangeStart === null) rangeStart = i;
            } else {
                if (rangeStart !== null) {
                    ranges.push({ start: rangeStart, end: i });
                    rangeStart = null;
                }
            }
        }
        if (rangeStart !== null) ranges.push({ start: rangeStart, end: NUM_LEDS });
        return ranges;
    }, [occupiedPixels]);

    // Check if a zone would overlap with any active zone (excluding itself)
    const wouldOverlap = (start: number, end: number, excludeKey?: string) => {
        return zones.some(
            (z) => z.isActive && z.key !== excludeKey && start < z.end && end > z.start
        );
    };

    const handleAdd = () => {
        const start = parseInt(form.start);
        const end = parseInt(form.end);
        if (!form.name || isNaN(start) || isNaN(end) || start >= end) return;

        dispatch(addZone({ name: form.name, start, end }));
        saveZone({ name: form.name, key: "", start, end }); // key will be generated on device
        setShowForm(false);
        setForm({ name: "", start: "0", end: "153" });
    };

    const handleToggle = (zone: typeof zones[0]) => {
        // Don't allow activating if it would overlap
        if (!zone.isActive && wouldOverlap(zone.start, zone.end, zone.key)) {
            dispatch(setError(t('zones.errors.overlap', { 
                name: zone.name, 
                start: zone.start, 
                end: zone.end 
            })));
            return;
        }
        
        // Контроллер сам очищает светодиоды при деактивации,
        // режим удалять не нужно — он сохранится для повторного включения
        dispatch(editZone({
            key: zone.key,
            name: zone.name,
            start: zone.start,
            end: zone.end,
            isActive: !zone.isActive,
        }));
    };

    const handleSelectRange = (range: { start: number; end: number }) => {
        setForm((f) => ({ ...f, start: String(range.start), end: String(range.end) }));
    };

    return (
        <div className="tab-content">
            {/* LED Strip Visualization */}
            <div className="card-glass">
                <h3 className="card-title mb-3">LED Strip Overview</h3>
                <div className="strip-bar">
                    {Array.from({ length: NUM_LEDS }).map((_, i) => {
                        const zone = zones.find((z) => z.isActive && i >= z.start && i < z.end);
                        return (
                            <div
                                key={i}
                                className="strip-pixel"
                                style={{
                                    background: zone
                                        ? zone.currentMode?.colors?.[0]
                                            ? `rgb(${zone.currentMode.colors[0].join(",")})`
                                            : "var(--teal)"
                                        : "rgba(27,27,27,0.08)",
                                }}
                                title={zone ? `${zone.name} [${i}]` : `Free [${i}]`}
                            />
                        );
                    })}
                </div>
                <div className="strip-legend">
                    <span>0</span>
                    <span>{NUM_LEDS}</span>
                </div>
            </div>

            {/* Zone List */}
            <div className="card-glass">
                <div className="flex-between mb-3">
                    <h3 className="card-title">{t('zones.title')}</h3>
                    {isConnected && (
                        <button 
                            className="btn btn-accent btn-sm" 
                            onClick={() => setShowForm(!showForm)}
                            disabled={isLoadingZones}
                        >
                            {showForm ? t('zones.form.cancel') : t('zones.addZone')}
                        </button>
                    )}
                </div>

                {/* Add Zone Form */}
                {showForm && (
                    <div className="zone-form mb-4">
                        <div className="form-field">
                            <label>{t('zones.form.name')}</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t('zones.form.namePlaceholder')}
                                maxLength={153}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-field">
                                <label>{t('zones.form.start')}</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={153}
                                    value={form.start}
                                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                                />
                            </div>
                            <div className="form-field">
                                <label>{t('zones.form.end')}</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={153}
                                    value={form.end}
                                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Use occupied mode */}
                        <label className="checkbox-row">
                            <input
                                type="checkbox"
                                checked={useOccupied}
                                onChange={(e) => setUseOccupied(e.target.checked)}
                            />
                            <span>{t('zones.form.useOccupied')}</span>
                        </label>

                        {useOccupied && (
                            <div className="free-ranges">
                                {(() => {
                                    // Filter out 0-length ranges
                                    const validRanges = freeRanges.filter(r => r.end > r.start);
                                    if (validRanges.length === 0) {
                                        return <p className="text-muted text-sm">{t('zones.noFreeRanges')}</p>;
                                    }
                                    // If only one range and it's 0–0, show message
                                    if (validRanges.length === 1 && validRanges[0].start === 0 && validRanges[0].end === 0) {
                                        return <p className="text-muted text-sm">{t('zones.noFreeRanges')}</p>;
                                    }
                                    return validRanges.map((r, i) => (
                                        <button
                                            key={i}
                                            className={`range-chip ${form.start === String(r.start) && form.end === String(r.end) ? "active" : ""}`}
                                            onClick={() => handleSelectRange(r)}
                                        >
                                            {r.start} – {r.end} ({r.end - r.start} LEDs)
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}

                        <button
                            className="btn btn-primary w-full mt-2"
                            onClick={handleAdd}
                            disabled={!form.name || parseInt(form.start) >= parseInt(form.end) || isLoadingZones}
                        >
                            {t('zones.form.save')}
                        </button>
                    </div>
                )}

                {/* Zone Cards */}
                {isLoadingZones ? (
                    <div className="zone-list">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="zone-card skeleton">
                                <div className="skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '8px' }} />
                                <div className="skeleton-line" style={{ width: '40%', height: '14px' }} />
                            </div>
                        ))}
                    </div>
                ) : zones.length === 0 ? (
                    <p className="text-muted text-sm">
                        {isConnected ? t('zones.noZones') : t('zones.noZones')}
                    </p>
                ) : (
                    <div className="zone-list">
                        {zones.map((zone) => {
                            const hasOverlap =
                                !zone.isActive && wouldOverlap(zone.start, zone.end, zone.key);

                            return (
                                <div
                                    key={zone.key}
                                    className={`zone-card ${zone.isActive ? "active" : "inactive"}`}
                                >
                                    <div className="zone-card-top">
                                        <div className="zone-card-info">
                                            <h4>{zone.name}</h4>
                                            <span className="zone-range">
                                                LEDs {zone.start}–{zone.end} · {zone.end - zone.start} px
                                            </span>
                                        </div>

                                        <div className="zone-card-actions">
                                            {/* Toggle */}
                                            <button
                                                className={`toggle ${zone.isActive ? "on" : ""}`}
                                                onClick={() => handleToggle(zone)}
                                                disabled={!isConnected || hasOverlap || isLoadingZones}
                                                title={hasOverlap ? t('zones.tooltips.overlaps') : zone.isActive ? t('zones.tooltips.deactivate') : t('zones.tooltips.activate')}
                                            >
                                                <span className="toggle-knob" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mode Preview */}
                                    {zone.currentMode && zone.isActive && (
                                        <div className="zone-card-preview">
                                            <ModePreview
                                                type={zone.currentMode.type}
                                                speed={zone.currentMode.speed}
                                                colors={zone.currentMode.colors}
                                                width={280}
                                                height={24}
                                            />
                                            <span className="text-xs text-muted">
                                                {zone.currentMode.type} · speed {zone.currentMode.speed}
                                            </span>
                                        </div>
                                    )}

                                    {hasOverlap && (
                                        <p className="text-warn text-xs mt-2">
                                            {t('zones.tooltips.overlaps')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
