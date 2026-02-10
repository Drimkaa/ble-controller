"use client";

import { useCallback } from "react";
import { useTranslations } from 'next-intl';
import {
    connectBle,
    setBrightness,
    setBrightnessLocal,
    setPower,
} from "../../store/bleSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

export default function MainTab() {
    const t = useTranslations();
    const dispatch = useAppDispatch();
    const { supportsBle, isConnected, isConnecting, isOn, brightness, error, logs } =
        useAppSelector((s) => s.ble);

    const handleConnect = useCallback(() => {
        if (!supportsBle) return;
        dispatch(connectBle());
    }, [dispatch, supportsBle]);

    const togglePower = useCallback(() => {
        dispatch(setPower(!isOn));
    }, [dispatch, isOn]);

    const applyBrightness = useCallback(() => {
        dispatch(setBrightness(brightness));
    }, [dispatch, brightness]);

    return (
        <div className="tab-content">
            {/* Connection Card */}
            <div className="card-glass">
                <div className="card-header">
                    <div className="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="card-title">{t('main.device.title')}</h3>
                        <p className="card-sub">{t('main.device.subtitle')}</p>
                    </div>
                </div>

                <button
                    className="btn btn-primary w-full"
                    onClick={handleConnect}
                    disabled={isConnecting || isConnected || !supportsBle}
                >
                    {isConnecting ? (
                        <span className="btn-loading">
                            <span className="spinner" />
                            {t('main.device.connecting')}
                        </span>
                    ) : isConnected ? (
                        t('main.device.connected')
                    ) : (
                        t('main.device.connect')
                    )}
                </button>

                {!supportsBle && (
                    <p className="text-error text-sm mt-2">
                        {t('main.device.notSupported')}
                    </p>
                )}
            </div>

            {/* Power Card */}
            <div className="card-glass">
                <div className="card-header">
                    <div className="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2v10M18.36 6.64A9 9 0 115.64 6.64" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="card-title">{t('main.power.title')}</h3>
                        <p className="card-sub">{isOn ? t('main.power.on') : t('main.power.off')}</p>
                    </div>
                </div>

                <button
                    className={`btn w-full ${isOn ? "btn-danger" : "btn-ghost"}`}
                    onClick={togglePower}
                    disabled={!isConnected}
                >
                    {isOn ? t('main.power.turnOff') : t('main.power.turnOn')}
                </button>
            </div>

            {/* Brightness Card */}
            <div className="card-glass">
                <div className="card-header">
                    <div className="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="card-title">{t('main.brightness.title')}</h3>
                        <p className="card-sub">{brightness} / 255</p>
                    </div>
                </div>

                <div className="slider-row">
                    <input
                        className="range-slider"
                        type="range"
                        min={0}
                        max={255}
                        value={brightness}
                        onChange={(e) => dispatch(setBrightnessLocal(Number(e.target.value)))}
                        disabled={!isConnected}
                    />
                    <button
                        className="btn btn-accent btn-sm"
                        onClick={applyBrightness}
                        disabled={!isConnected}
                    >
                        {t('main.brightness.apply')}
                    </button>
                </div>
            </div>

            {/* Activity Log */}
            <div className="card-glass card-log">
                <h3 className="card-title mb-2">{t('main.logs.title')}</h3>
                {error && <p className="text-error text-sm">{error}</p>}
                {logs.length === 0 ? (
                    <p className="text-muted text-sm">No events yet.</p>
                ) : (
                    <ul className="log-list">
                        {logs.map((log, i) => (
                            <li key={`${log}-${i}`}>{log}</li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
