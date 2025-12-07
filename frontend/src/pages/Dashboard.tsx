import { KPIGrid } from "../components/dashboard/KPIGrid";
import { ConversionChart } from "../components/dashboard/ConversionChart";
import { SegmentChart } from "../components/dashboard/SegmentChart";

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Conversion Impact</h1>
                <p className="text-slate-500">Real-time performance of your nudge strategies.</p>
            </div>

            <KPIGrid />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConversionChart />
                <SegmentChart />
            </div>
        </div>
    );
}
