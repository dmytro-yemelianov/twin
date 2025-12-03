import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ImportResult {
    sitesCreated: number
    racksCreated: number
    devicesCreated: number
    anomaliesDetected?: number
    errors: string[]
    warnings: string[]
}

interface CsvImportDialogProps {
    regionId: string
    onSuccess?: () => void
}

export function CsvImportDialog({ regionId, onSuccess }: CsvImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
        }
    }

    const handleUpload = async () => {
        if (!file || !regionId) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('regionId', regionId)

        try {
            const res = await fetch('/api/sites/import', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Import failed')
            }

            const data = await res.json()
            setResult(data)
            toast.success('Import completed')
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Failed to import CSV')
        } finally {
            setUploading(false)
        }
    }

    const reset = () => {
        setFile(null)
        setResult(null)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Inventory
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import DUMM Inventory</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file in the DUMM-Inventory format to populate sites, racks, and devices.
                    </DialogDescription>
                </DialogHeader>

                {!result ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="csv-file">Inventory CSV</Label>
                            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} />
                        </div>
                        {file && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                                <FileText className="h-4 w-4" />
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                                <div className="text-2xl font-bold text-green-600">{result.sitesCreated}</div>
                                <div className="text-xs text-muted-foreground">Sites Created</div>
                            </div>
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                <div className="text-2xl font-bold text-blue-600">{result.racksCreated}</div>
                                <div className="text-xs text-muted-foreground">Racks Created</div>
                            </div>
                            <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                                <div className="text-2xl font-bold text-purple-600">{result.devicesCreated}</div>
                                <div className="text-xs text-muted-foreground">Devices Created</div>
                            </div>
                            {result.anomaliesDetected !== undefined && (
                                <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                                    <div className="text-2xl font-bold text-orange-600">{result.anomaliesDetected}</div>
                                    <div className="text-xs text-muted-foreground">Anomalies Detected</div>
                                </div>
                            )}
                        </div>

                        {result.errors.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Errors ({result.errors.length})</AlertTitle>
                                <AlertDescription>
                                    <ScrollArea className="h-[100px] w-full rounded border p-2 bg-background mt-2">
                                        <ul className="list-disc pl-4 text-xs space-y-1">
                                            {result.errors.map((err, i) => (
                                                <li key={i}>{err}</li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </AlertDescription>
                            </Alert>
                        )}

                        {result.warnings.length > 0 && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                <AlertTitle>Warnings ({result.warnings.length})</AlertTitle>
                                <AlertDescription>
                                    <ScrollArea className="h-[100px] w-full rounded border p-2 bg-background mt-2">
                                        <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground">
                                            {result.warnings.map((warn, i) => (
                                                <li key={i}>{warn}</li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!result ? (
                        <Button onClick={handleUpload} disabled={!file || uploading}>
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import Data
                        </Button>
                    ) : (
                        <Button onClick={reset}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
