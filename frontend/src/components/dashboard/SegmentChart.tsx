import { Card, Title, BarChart } from "@tremor/react";

const chartdata = [
    {
        name: "Mobile Users",
        "Lift %": 18.2,
    },
    {
        name: "Desktop Users",
        "Lift %": 10.5,
    },
    {
        name: "Returning Visitors",
        "Lift %": 22.1,
    },
    {
        name: "New Visitors",
        "Lift %": 8.4,
    },
    {
        name: "High Value Carts",
        "Lift %": 25.6,
    },
];

const dataFormatter = (number: number) => {
    return Intl.NumberFormat("us").format(number).toString() + "%";
};

export function SegmentChart() {
    return (
        <Card>
            <Title>Lift by Segment</Title>
            <BarChart
                className="h-72 mt-4"
                data={chartdata}
                index="name"
                categories={["Lift %"]}
                colors={["blue"]}
                valueFormatter={dataFormatter}
                yAxisWidth={48}
            />
        </Card>
    );
}
