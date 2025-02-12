import { DbObject } from "../../jsondb/types";

export interface DB_Chapter extends DbObject {
    headerId: number | undefined;
    pageIds: number[];
}
