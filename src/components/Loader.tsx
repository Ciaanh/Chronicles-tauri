import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";

export default function Loader() {
    const [file, setFile] = useState("");

    async function loadDataFromFile() {
        const file = await open({
            multiple: false,
            directory: false,
        }).then((fileName) => {
            if (fileName !== undefined && fileName !== null) {
                setFile(fileName);
            } else {
                console.log("No file selected");
            }

            return fileName;
        });
    }

    return (
        <main>
            <h1>Loader</h1>
            <button onClick={loadDataFromFile}>Load data from file</button>
            {file && <p>File: {file}</p>}
        </main>
    );
}
