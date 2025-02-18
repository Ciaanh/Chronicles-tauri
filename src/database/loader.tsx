import "../_style/loader.scss";

import { useContext } from "react";
import { dbRepository } from "./dbcontext";
import { Button, Card, Flex, Typography } from "antd";

function Loader() {
    const dbContext = useContext(dbRepository);

    return (
        <Card className="centeredCard">
            <Flex className="flexContainer" justify="center" align="center" vertical >
                <Typography.Title>Chronicles</Typography.Title>
                <Typography.Paragraph>
                    Welcome to the Chronicles database manager
                </Typography.Paragraph>
                <Button onClick={() => dbContext.load()}>Load a json db</Button>
                {/* <Button onClick={() => dbContext.validate()}>Validate json db</Button> */}
            </Flex>
        </Card>
    );
}

export default Loader;
