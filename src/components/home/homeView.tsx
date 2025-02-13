import {
    Button,
    Card,
    Elevation,
    FormGroup,
    InputGroup,
} from "@blueprintjs/core";
import EventList from "../_event/eventList";

function HomeView() {
    return (
        <div>
            <h1>Home</h1>

            <Card elevation={Elevation.TWO}>
                <EventList />
            </Card>
        </div>
    );
}

export default HomeView;
