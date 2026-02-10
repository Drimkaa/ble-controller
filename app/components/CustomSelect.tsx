"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type Option = {
    value: string;
    label: string;
};

type CustomSelectProps = {
    value: string | null;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
};

export default function CustomSelect({
    value,
    options,
    onChange,
    placeholder = "Choose an option...",
    className = "",
    disabled = false,
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current!.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;
                const dropdownHeight = 250;

                if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    // Open upward
                    setDropdownStyle({
                        position: 'fixed',
                        bottom: window.innerHeight - rect.top + 4,
                        left: rect.left,
                        width: rect.width,
                    });
                } else {
                    // Open downward
                    setDropdownStyle({
                        position: 'fixed',
                        top: rect.bottom + 4,
                        left: rect.left,
                        width: rect.width,
                    });
                }
            };

            updatePosition();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        const handleScrollOrResize = () => {
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", handleScrollOrResize, true);
            window.addEventListener("resize", handleScrollOrResize);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const dropdown = isOpen && mounted ? (
        <div
            ref={dropdownRef}
            className="custom-select-dropdown"
            style={dropdownStyle}
        >
            {options.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    className={`custom-select-option ${opt.value === value ? "selected" : ""}`}
                    onClick={() => handleSelect(opt.value)}
                >
                    {opt.label}
                    {opt.value === value && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12l5 5L20 7" />
                        </svg>
                    )}
                </button>
            ))}
        </div>
    ) : null;

    return (
        <>
            <div ref={containerRef} className={`custom-select ${className}`}>
                <button
                    type="button"
                    className="custom-select-trigger"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <span className={selectedOption ? "" : "text-muted"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={`custom-select-arrow ${isOpen ? "open" : ""}`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
            </div>
            {mounted && dropdown && createPortal(dropdown, document.body)}
        </>
    );
}
