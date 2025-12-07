import { useState } from "react";
import { ModelCard } from "../components/models/ModelCard";
import { TrainingConfig } from "../components/models/TrainingConfig";

const models = [
    {
        id: "purchase-prob",
        title: "Purchase Probability",
        description: "Predicts the likelihood of a user completing a purchase in the current session.",
        tags: ["Conversion", "Real-time"],
    },
    {
        id: "churn-risk",
        title: "Churn Risk",
        description: "Identifies users who are likely to stop using the platform or unsubscribe.",
        tags: ["Retention", "Batch"],
    },
    {
        id: "ltv-prediction",
        title: "LTV Prediction",
        description: "Estimates the total lifetime value of a customer based on early signals.",
        tags: ["Revenue", "Long-term"],
    },
];

export default function Models() {
    const [selectedModel, setSelectedModel] = useState("purchase-prob");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Prediction Models</h1>
                <p className="text-slate-500">Select and train models to predict user behavior.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {models.map((model) => (
                    <ModelCard
                        key={model.id}
                        title={model.title}
                        description={model.description}
                        tags={model.tags}
                        isSelected={selectedModel === model.id}
                        onSelect={() => setSelectedModel(model.id)}
                    />
                ))}
            </div>

            <div className="mt-8">
                <TrainingConfig />
            </div>
        </div>
    );
}
