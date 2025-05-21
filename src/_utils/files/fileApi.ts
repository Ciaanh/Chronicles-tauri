import { FileContent } from "./fileContent";
import JSZip from "jszip";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export type FileApi = {
    pack: (zipContent: FileContent[]) => Promise<void>;
};

const fileApi: FileApi = {
    async pack(zipContent: FileContent[]) {
        const zip = new JSZip();
        zipContent.forEach((file: FileContent) => {
            zip.file(file.name, file.content);
        });
        try {
            const zipBlob = await zip.generateAsync({ type: "uint8array" });
            const filePath = await save({
                title: "Select the File Path to save",
                defaultPath: "Chronicles.zip",
                filters: [
                    {
                        name: "ZIP Files",
                        extensions: ["zip"],
                    },
                ],
            });
            if (filePath) {
                await writeFile(filePath, zipBlob);
            }
        } catch (err) {
            console.error("Export failed:", err);
        }
    },
};

export { fileApi };