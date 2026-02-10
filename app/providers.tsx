"use client";

import { ReactNode, useRef } from "react";
import { Provider } from "react-redux";
import { AppStore, makeStore } from "../store/store";
import { LocaleProvider } from "../lib/LocaleProvider";

export function Providers({ children }: { children: ReactNode }) {
    const storeRef = useRef<AppStore>(undefined);
    if (!storeRef.current) {
        storeRef.current = makeStore();
    }

    return (
        <Provider store={storeRef.current}>
            <LocaleProvider>
                {children}
            </LocaleProvider>
        </Provider>
    );
}
