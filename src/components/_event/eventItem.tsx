import { Event } from "../../database/models";

interface EventItemProps {
    event: Event;
}

const EventItem: React.FC<EventItemProps> = ({ event }) => {
    return (
        <div>
            <p>
                {event._id} - {event.name}
            </p>
        </div>
    );
};

export default EventItem;
