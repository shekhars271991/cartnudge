import { Card, Title, AreaChart } from "@tremor/react";

const chartdata = [
    {
        date: "Jan 22",
        Treatment: 2.4,
        Control: 2.1,
    },
    {
        date: "Feb 22",
        Treatment: 2.8,
        Control: 2.2,
    },
    {
        date: "Mar 22",
        Treatment: 3.2,
        Control: 2.3,
    },
    {
        date: "Apr 22",
        Treatment: 3.5,
        Control: 2.4,
    },
    {
        date: "May 22",
        Treatment: 3.8,
        Control: 2.5,
    },
    {
        date: "Jun 22",
        Treatment: 4.1,
        Control: 2.5,
    },
];

const dataFormatter = (number: number) => {
    return Intl.NumberFormat("us").format(number).toString() + "%";
};

export function ConversionChart() {
    return (
        <Card>
            <Title>Conversion Rate: Treatment vs Control</Title>
            <AreaChart
                className="h-72 mt-4"
                data={chartdata}
                index="date"
                categories={["Treatment", "Control"]}
                colors={["blue", "slate"]}
                valueFormatter={dataFormatter}
            />
        </Card>
    );
}
