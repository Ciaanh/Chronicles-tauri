import { createAppSlice } from "../createAppSlice";
import { open } from "@tauri-apps/plugin-dialog";
import { dbContext } from "../database/dbcontext";
import { Database } from "neutron-db";

export interface dbcontextSliceState {
    database: Database | null;
}

const initialState: dbcontextSliceState = {
    database: null,
};

export const dbcontextSlice = createAppSlice({
    name: "dbcontext",
    initialState,
    reducers: (create) => ({
        initDbContextAsync: create.asyncThunk(
            async () => {
                return await open({
                    multiple: false,
                    directory: false,
                });
            },
            {
                // pending: (state) => {},
                fulfilled: (state, action) => {
                    if (action.payload !== null)
                        state.database = dbContext(action.payload);
                },
                // rejected: (state) => {
                //     state.dbcontext = null;
                // },
            }
        ),
    }),
    // selectors: {
    //     selectDbContect: (state) => {
    //         if (state.databasePath === null) return null;
    //         return dbContext(state.databasePath);
    //     },
    // },
});
