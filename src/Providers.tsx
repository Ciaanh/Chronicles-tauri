import { PropsWithChildren } from "react";
import { BrowserRouter } from "react-router-dom";
import { Provider as ReduxProvider } from "react-redux";

import { store } from "./store/store"

export default function ({ children }: PropsWithChildren) {
    return (
        <ReduxProvider store={store}>
            <BrowserRouter>{children}</BrowserRouter>
        </ReduxProvider>
    );
}
