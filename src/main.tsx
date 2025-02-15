import "./_style/main.scss";

import ReactDOM from "react-dom/client";
import Providers from "./Providers";
import AppContent from "./appcontent";
import { App } from "antd";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <Providers>
        <App>
            <AppContent />
        </App>
    </Providers>
);
