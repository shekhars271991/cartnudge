import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Upload,
    FileUp,
    Code,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    FileText,
    AlertCircle,
    CheckCircle2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaField } from "./SchemaBuilder";

interface DataIngestionProps {
    schema: SchemaField[];
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onFileUpload?: (file: File) => void;
}

export function DataIngestion({
    schema,
    isCollapsed = false,
    onToggleCollapse,
    onFileUpload,
}: DataIngestionProps) {
    const [activeTab, setActiveTab] = useState<"csv" | "api">("csv");
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

    const apiEndpoint = "https://api.cartnudge.ai/v1/users";
    const apiKey = "sk_live_xxxxxxxxxxxxxxxx";

    const generateCurlSnippet = () => {
        const sampleData = schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string":
                    value = `"sample_${field.name}"`;
                    break;
                case "email":
                    value = `"user@example.com"`;
                    break;
                case "number":
                    value = 0;
                    break;
                case "boolean":
                    value = true;
                    break;
                case "date":
                    value = `"2025-01-01"`;
                    break;
                default:
                    value = `"value"`;
            }
            return acc + `\n    "${field.name}": ${typeof value === "string" ? value : JSON.stringify(value)},`;
        }, "");

        return `curl -X POST "${apiEndpoint}" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{${sampleData.slice(0, -1)}
  }'`;
    };

    const generateJsSnippet = () => {
        const sampleData = schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string":
                    value = `sample_${field.name}`;
                    break;
                case "email":
                    value = "user@example.com";
                    break;
                case "number":
                    value = 0;
                    break;
                case "boolean":
                    value = true;
                    break;
                case "date":
                    value = "2025-01-01";
                    break;
                default:
                    value = "value";
            }
            acc[field.name] = value;
            return acc;
        }, {} as Record<string, string | number | boolean>);

        return `const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(sampleData, null, 2).replace(/\n/g, '\n  ')})
});

const user = await response.json();
console.log(user);`;
    };

    const generatePythonSnippet = () => {
        const sampleData = schema.reduce((acc, field) => {
            let value: string | number | boolean = "";
            switch (field.type) {
                case "string":
                    value = `sample_${field.name}`;
                    break;
                case "email":
                    value = "user@example.com";
                    break;
                case "number":
                    value = 0;
                    break;
                case "boolean":
                    value = true;
                    break;
                case "date":
                    value = "2025-01-01";
                    break;
                default:
                    value = "value";
            }
            acc[field.name] = value;
            return acc;
        }, {} as Record<string, string | number | boolean>);

        return `import requests

response = requests.post(
    "${apiEndpoint}",
    headers={
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
    },
    json=${JSON.stringify(sampleData, null, 4).replace(/"/g, "'").replace(/true/g, "True").replace(/false/g, "False")}
)

user = response.json()
print(user)`;
    };

    const handleCopy = async (snippet: string, type: string) => {
        await navigator.clipboard.writeText(snippet);
        setCopiedSnippet(type);
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type === "text/csv") {
            setUploadedFile(file);
            onFileUpload?.(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            onFileUpload?.(file);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggleCollapse}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {isCollapsed ? (
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-slate-900">
                            Data Ingestion
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Import user data via CSV upload or API
                        </p>
                    </div>
                </div>
                {uploadedFile && (
                    <Badge className="badge-success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        File uploaded
                    </Badge>
                )}
            </button>

            {/* Content */}
            {!isCollapsed && (
                <div className="border-t border-slate-100 p-5">
                    {schema.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">
                                Define your schema first before importing data
                            </p>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "csv" | "api")}>
                            <TabsList className="grid grid-cols-2 w-full max-w-[400px] mb-6">
                                <TabsTrigger value="csv" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    CSV Upload
                                </TabsTrigger>
                                <TabsTrigger value="api" className="gap-2">
                                    <Code className="h-4 w-4" />
                                    API Endpoint
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="csv" className="mt-0">
                                {/* Drop Zone */}
                                <div
                                    className={cn(
                                        "drop-zone rounded-lg p-8 text-center cursor-pointer",
                                        isDragging && "drag-over"
                                    )}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() =>
                                        document.getElementById("csv-upload")?.click()
                                    }
                                >
                                    <input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    {uploadedFile ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                                                <FileText className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 mb-1">
                                                {uploadedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-500 mb-3">
                                                {(uploadedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUploadedFile(null);
                                                }}
                                                className="text-slate-500 hover:text-red-600"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <FileUp className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 mb-1">
                                                Drop your CSV file here
                                            </p>
                                            <p className="text-xs text-slate-500 mb-3">
                                                or click to browse
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                Supports .csv files up to 50MB
                                            </Badge>
                                        </>
                                    )}
                                </div>

                                {/* Expected Format */}
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                        Expected CSV columns:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {schema.map((field) => (
                                            <Badge
                                                key={field.id}
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    field.required &&
                                                        "border-amber-300 bg-amber-50 text-amber-700"
                                                )}
                                            >
                                                {field.name}
                                                {field.required && " *"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="api" className="mt-0">
                                <div className="space-y-4">
                                    {/* Endpoint Info */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                            POST
                                        </Badge>
                                        <code className="text-sm font-mono text-slate-700 flex-1">
                                            {apiEndpoint}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopy(apiEndpoint, "endpoint")}
                                            className="h-8"
                                        >
                                            {copiedSnippet === "endpoint" ? (
                                                <Check className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>

                                    {/* Code Snippets */}
                                    <Tabs defaultValue="curl" className="w-full">
                                        <TabsList className="h-9 p-1">
                                            <TabsTrigger value="curl" className="text-xs px-3">
                                                cURL
                                            </TabsTrigger>
                                            <TabsTrigger value="javascript" className="text-xs px-3">
                                                JavaScript
                                            </TabsTrigger>
                                            <TabsTrigger value="python" className="text-xs px-3">
                                                Python
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="curl">
                                            <div className="relative">
                                                <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                                                    {generateCurlSnippet()}
                                                </pre>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                                    onClick={() =>
                                                        handleCopy(generateCurlSnippet(), "curl")
                                                    }
                                                >
                                                    {copiedSnippet === "curl" ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="javascript">
                                            <div className="relative">
                                                <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                                                    {generateJsSnippet()}
                                                </pre>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                                    onClick={() =>
                                                        handleCopy(generateJsSnippet(), "js")
                                                    }
                                                >
                                                    {copiedSnippet === "js" ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="python">
                                            <div className="relative">
                                                <pre className="code-block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                                                    {generatePythonSnippet()}
                                                </pre>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 right-2 h-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                                    onClick={() =>
                                                        handleCopy(generatePythonSnippet(), "python")
                                                    }
                                                >
                                                    {copiedSnippet === "python" ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Copy className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            )}
        </div>
    );
}

