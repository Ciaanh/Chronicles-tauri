import { Button, Card, Elevation, FormGroup, InputGroup } from "@blueprintjs/core";
import Loader from "../Loader";

function HomeView() {
    return (
        <div>
            <h1>Home</h1>
            {/* <Card elevation={Elevation.TWO}>
                <h3>Simple Form</h3>
                <FormGroup
                    label="Name"
                    labelFor="name-input"
                    labelInfo="(required)"
                >
                    <InputGroup id="name-input" placeholder="Enter your name" />
                </FormGroup>
                <Button intent="primary" text="Submit" />
            </Card> */}
            <Card elevation={Elevation.TWO}>
                <Loader />
            </Card>
        </div>
    );
}

export default HomeView;