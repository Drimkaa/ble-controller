"use client";

import { useRef, useEffect } from "react";
import type { Color } from "../../lib/bleClient";

type Props = {
    type: string;
    speed: number;
    colors: Color[];
    width?: number;
    height?: number;
};

function getLedCount(width: number) {
    const minCount = 16;
    const maxCount = 48;
    const ledSize = 12;
    return Math.max(minCount, Math.min(maxCount, Math.floor(width / ledSize)));
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

// RGB to HSV conversion
function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    const s = max === 0 ? 0 : delta / max;
    const v = max;

    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / delta + 2) / 6;
        } else {
            h = ((r - g) / delta + 4) / 6;
        }
    }

    return [Math.round(h * 360), Math.round(s * 255), Math.round(v * 255)];
}

// HSV to RGB conversion
function hsv2rgb(h: number, s: number, v: number): Color {
    h = h / 360;
    s = s / 255;
    v = v / 255;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r = 0, g = 0, b = 0;
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
    ];
}

function lerpColor(a: Color, b: Color, t: number): Color {
    return [
        clamp(Math.round(a[0] + (b[0] - a[0]) * t), 0, 255),
        clamp(Math.round(a[1] + (b[1] - a[1]) * t), 0, 255),
        clamp(Math.round(a[2] + (b[2] - a[2]) * t), 0, 255),
    ];
}

// Build a gradient strip exactly like C++ RainbowMode::build()
function buildGradientStrip(colors: Color[], count: number): Color[] {
    if (colors.length === 0) return Array(count).fill([0, 0, 0]);
    if (colors.length === 1) return Array(count).fill(colors[0]);

    const strip: Color[] = [];
    const total_length = count;
    const colors_length = colors.length;
    
    // Calculate intervals like in C++
    const intervals: number[] = new Array(colors_length);
    const interval_size = (total_length - colors_length) / colors_length;
    let led_sum = 0;
    
    for (let i = 0; i < colors_length; i++) {
        intervals[i] = Math.floor(interval_size);
        led_sum += Math.floor(interval_size);
    }
    
    // Distribute remaining LEDs
    for (let i = 0; i < total_length - led_sum - colors_length; i++) {
        intervals[i % colors_length] += 1;
    }
    
    // Build gradient strip
    for (let i = 0; i < colors_length; i++) {
        // Add the exact color
        strip.push([...colors[i]]);
        
        const next_color = (i + 1) % colors_length;
        
        // Interpolate to next color
        for (let j = 0; j < intervals[i]; j++) {
            const ratio = j / intervals[i];
            const r = Math.round(colors[i][0] * (1 - ratio) + colors[next_color][0] * ratio);
            const g = Math.round(colors[i][1] * (1 - ratio) + colors[next_color][1] * ratio);
            const b = Math.round(colors[i][2] * (1 - ratio) + colors[next_color][2] * ratio);
            
            strip.push([
                clamp(r, 0, 255),
                clamp(g, 0, 255),
                clamp(b, 0, 255),
            ]);
        }
    }
    
    return strip.slice(0, count);
}

export default function ModePreview({ type, speed, colors, width = 280, height = 40 }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef(0);
    const ledCount = getLedCount(width);
    
    // Initialize with proper maxProgress calculation
    const baseMaxProgress = 20;
    const initialMaxProgress = (type === "fade" || type === "pulse") ? baseMaxProgress * Math.max(speed, 1) : baseMaxProgress;
    
    const stateRef = useRef({
        progress: 0,
        maxProgress: initialMaxProgress,
        currentColor: 0,
        nextColor: colors.length > 1 ? 1 : 0,
        downLight: true,
        shift: 0,
        strip: buildGradientStrip(colors, ledCount),
    });

    useEffect(() => {
        // Reset state when params change
        // В C++: base max_progress = 20, для fade/pulse: max_progress *= speed
        const baseMaxProgress = 20;
        const maxP = (type === "fade" || type === "pulse") ? baseMaxProgress * Math.max(speed, 1) : baseMaxProgress;
        
        stateRef.current = {
            progress: 0,
            maxProgress: maxP,
            currentColor: 0,
            nextColor: colors.length > 1 ? 1 : 0,
            downLight: true,
            shift: 0,
            strip: buildGradientStrip(colors, ledCount),
        };
    }, [type, speed, colors, ledCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const safeColors = colors.length > 0 ? colors : [[0, 0, 0] as Color];

        let running = true;

        function draw() {
            if (!running || !ctx) return;

            const s = stateRef.current;
            ctx.clearRect(0, 0, width, height);

            const leds: Color[] = [];

            if (type === "static") {
                // StaticMode::animate() - просто устанавливает colors[0]
                for (let i = 0; i < ledCount; i++) {
                    leds.push(safeColors[0]);
                }
            } else if (type === "fade") {
                // FadeMode::animate() - точная формула из C++
                // temp_color[i] = (colors[next][i] * progress + colors[current][i] * (max_progress - progress)) / max_progress
                const current = safeColors[s.currentColor];
                const next = safeColors[s.nextColor];
                const progress = s.progress;
                const maxProgress = s.maxProgress;
                
                const r = Math.round((next[0] * progress + current[0] * (maxProgress - progress)) / maxProgress);
                const g = Math.round((next[1] * progress + current[1] * (maxProgress - progress)) / maxProgress);
                const b = Math.round((next[2] * progress + current[2] * (maxProgress - progress)) / maxProgress);
                
                const c: Color = [
                    clamp(r, 0, 255),
                    clamp(g, 0, 255),
                    clamp(b, 0, 255),
                ];
                
                for (let i = 0; i < ledCount; i++) leds.push(c);
                
                s.progress += 1;
                if (s.progress > s.maxProgress) {
                    s.progress = 0;
                    s.currentColor = (s.currentColor + 1) % safeColors.length;
                    s.nextColor = (s.nextColor + 1) % safeColors.length;
                }
            } else if (type === "pulse") {
                // PulseMode::animate() - с прозрачностью вместо затемнения
                // factor = downLight ? (max_progress - progress) : progress
                // alpha = factor / max_progress
                const progress = s.progress;
                const maxProgress = s.maxProgress;
                const factor = s.downLight ? (maxProgress - progress) : progress;
                const brightness = factor / maxProgress;
                
                const base = safeColors[s.currentColor];
                // Храним полный цвет + альфа канал
                const c: Color = [...base];
                
                for (let i = 0; i < ledCount; i++) leds.push(c);
                
                s.progress += 1;
                if (s.progress > s.maxProgress) {
                    s.progress = 0;
                    s.downLight = !s.downLight;
                    if (!s.downLight) {
                        s.currentColor = (s.currentColor + 1) % safeColors.length;
                    }
                }
                
                // Отрисовка с учетом alpha
                const gap = 2;
                const actualW = (width - gap * (ledCount - 1)) / ledCount;
                const radius = Math.min(actualW / 2, height / 2);

                for (let i = 0; i < leds.length; i++) {
                    const [r, g, b] = leds[i];
                    const x = i * (actualW + gap);

                    // Glow с альфой
                    ctx.shadowColor = `rgba(${r},${g},${b},${brightness})`;
                    ctx.shadowBlur = 6;
                    ctx.fillStyle = `rgba(${r},${g},${b},${brightness})`;
                    ctx.beginPath();
                    ctx.roundRect(x, (height - actualW) / 2, actualW, actualW, radius);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
                
                // Пропускаем общую отрисовку для pulse
                const delay = Math.max(16, 40 / Math.max(speed, 1));
                frameRef.current = window.setTimeout(() => requestAnimationFrame(draw), delay);
                return;
            } else if (type === "rainbow") {
                // RainbowMode::animate() - циклический сдвиг градиента
                for (let i = 0; i < ledCount; i++) {
                    const idx = (i + s.shift) % s.strip.length;
                    leds.push(s.strip[idx]);
                }
                // Сдвиг (в C++ это зависит от tick/speed, но для простоты используем 1)
                s.shift = (s.shift + 1) % s.strip.length;
            } else if (type === "fire") {
                // FireMode::fireDraw() - вариация HSV
                const base = safeColors[0];
                const [baseHue, baseSat, baseVal] = rgb2hsv(base[0], base[1], base[2]);
                
                for (let i = 0; i < ledCount; i++) {
                    // Random hue variation ±30 (like in C++ code)
                    const randomHue = (baseHue + Math.floor(Math.random() * 30)) % 360;
                    // Random brightness variation ±5 (like in C++ code)
                    const randomBrightness = clamp(baseVal - 5 + Math.floor(Math.random() * 10), 0, 255);
                    
                    leds.push(hsv2rgb(randomHue, baseSat, randomBrightness));
                }
            }

            // Render LEDs
            const gap = 2;
            const actualW = (width - gap * (ledCount - 1)) / ledCount;
            const radius = Math.min(actualW / 2, height / 2);

            for (let i = 0; i < leds.length; i++) {
                const [r, g, b] = leds[i];
                const x = i * (actualW + gap);

                // Glow
                ctx.shadowColor = `rgb(${r},${g},${b})`;
                ctx.shadowBlur = 6;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.beginPath();
                ctx.roundRect(x, (height - actualW) / 2, actualW, actualW, radius);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Speed-dependent frame rate
            const delay = type === "static" ? 500 : type === "fire" ? 80 : Math.max(16, 40 / Math.max(speed, 1));
            frameRef.current = window.setTimeout(() => requestAnimationFrame(draw), delay);
        }

        draw();

        return () => {
            running = false;
            clearTimeout(frameRef.current);
        };
    }, [type, speed, colors, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="mode-preview-canvas"
        />
    );
}
