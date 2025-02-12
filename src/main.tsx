import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Providers from "./Providers";

// if a local database does not exist, display a window to select an existing database to import or instantiate an empty one
// if a local database exists, load the database and set a global dbContext to access it from anywhere in the app
// if the database is not loaded, display a loading screen
// if the database is loaded, render the app

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    // <React.StrictMode>
    //     <Providers>
    //         <App />
    //     </Providers>
    // </React.StrictMode>
    <React.Fragment>
        <Providers>
            <App />
        </Providers>
    </React.Fragment>
);
