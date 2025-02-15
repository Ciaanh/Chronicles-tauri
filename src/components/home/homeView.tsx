import { Button, Card } from "antd";
import EventList from "../_event/eventList";
import { Filters } from "../filters";

interface HomeViewProps {
    filters: Filters;
}

const HomeView: React.FC<HomeViewProps> = ({ filters }) => {
    return (
        <div>
            <h1>Home</h1>

            <Card>
                <EventList filters={filters} />
            </Card>
        </div>
    );
};

export default HomeView;
