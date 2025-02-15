import "./main.scss";

import ReactDOM from "react-dom/client";
import Providers from "./Providers";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <Providers>
        <App />
    </Providers>
);
