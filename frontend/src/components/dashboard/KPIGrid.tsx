import { Card, Metric, Text, Flex, BadgeDelta, Grid } from "@tremor/react";

const categories = [
    {
        title: "Total Predictions Served",
        metric: "1.2M",
        metricPrev: "1.0M",
        delta: "23.1%",
        deltaType: "moderateIncrease",
    },
    {
        title: "Conversion Lift",
        metric: "+14.2%",
        metricPrev: "+12.1%",
        delta: "2.1%",
        deltaType: "increase",
    },
    {
        title: "Revenue Attributed",
        metric: "$45,200",
        metricPrev: "$38,000",
        delta: "18.9%",
        deltaType: "moderateIncrease",
    },
];

export function KPIGrid() {
    return (
        <Grid numItemsSm={2} numItemsLg={3} className="gap-6">
            {categories.map((item) => (
                <Card key={item.title} decoration="top" decorationColor="blue">
                    <Flex alignItems="start">
                        <Text>{item.title}</Text>
                        <BadgeDelta deltaType={item.deltaType}>{item.delta}</BadgeDelta>
                    </Flex>
                    <Metric>{item.metric}</Metric>
                </Card>
            ))}
        </Grid>
    );
}
