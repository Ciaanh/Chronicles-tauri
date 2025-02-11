import { createAppSlice } from "../createAppSlice";
import { tableNames } from "../database/dbcontext";
import { DB_Event } from "../database/models/DB_Event";
import { Event } from "./models/Event";
import { EventMapperFromDBs } from "../mappers/event";
import { store } from "../store";

export interface EventsSliceState {
    events: Event[];
}

const initialState: EventsSliceState = {
    events: [],
};

export const eventsSlice = createAppSlice({
    name: "events",
    initialState,
    reducers: (create) => ({
        findAll: create.reducer((state) => {
            const reduxStore = store.getState();

            const dbContext = reduxStore.dbcontext.database;
            if (dbContext === null) {
                console.error("Database not initialized");
                return;
            }

            const events: DB_Event[] = dbContext.getAll(tableNames.events);
            state.events = EventMapperFromDBs(events);
        }),
        //   decrement: create.reducer(state => {
        //     state.value -= 1
        //   }),
        //   // Use the `PayloadAction` type to declare the contents of `action.payload`
        //   incrementByAmount: create.reducer(
        //     (state, action: PayloadAction<number>) => {
        //       state.value += action.payload
        //     },
        //   ),
        //   // The function below is called a thunk and allows us to perform async logic. It
        //   // can be dispatched like a regular action: `dispatch(incrementAsync(10))`. This
        //   // will call the thunk with the `dispatch` function as the first argument. Async
        //   // code can then be executed and other actions can be dispatched. Thunks are
        //   // typically used to make async requests.
        //   incrementAsync: create.asyncThunk(
        //     async (amount: number) => {
        //       const response = await fetchCount(amount)
        //       // The value we return becomes the `fulfilled` action payload
        //       return response.data
        //     },
        //     {
        //       pending: state => {
        //         state.status = "loading"
        //       },
        //       fulfilled: (state, action) => {
        //         state.status = "idle"
        //         state.value += action.payload
        //       },
        //       rejected: state => {
        //         state.status = "failed"
        //       },
        //     },
        //   ),
    }),
    // You can define your selectors here. These selectors receive the slice
    // state as their first argument.
    selectors: {
        //   selectCount: counter => counter.value,
        //   selectStatus: counter => counter.status,
    },
});
