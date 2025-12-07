import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface ModelCardProps {
    title: string;
    description: string;
    isSelected: boolean;
    onSelect: () => void;
    tags: string[];
}

export function ModelCard({ title, description, isSelected, onSelect, tags }: ModelCardProps) {
    return (
        <Card
            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-slate-300'}`}
            onClick={onSelect}
        >
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    {isSelected && <div className="bg-primary text-white rounded-full p-1"><Check className="h-3 w-3" /></div>}
                </div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
