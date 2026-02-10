import { configureStore } from "@reduxjs/toolkit";
import bleReducer from "./bleSlice";

export const makeStore = () =>
    configureStore({
        reducer: {
            ble: bleReducer,
        },
    });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
