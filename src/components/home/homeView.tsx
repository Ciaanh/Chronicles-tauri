import {
    Button,
    Card,
    Elevation,
    FormGroup,
    InputGroup,
} from "@blueprintjs/core";
import EventList from "../_event/eventList";
import { Filters } from "../filters";

interface HomeViewProps {
    filters: Filters;
}

const HomeView: React.FC<HomeViewProps> = ({ filters }) => {
    return (
        <div>
            <h1>Home</h1>

            <Card elevation={Elevation.TWO}>
                <EventList filters={filters}/>
            </Card>
        </div>
    );
};

export default HomeView;
