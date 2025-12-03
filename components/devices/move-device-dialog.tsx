import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Move, Copy, AlertCircle } from 'lucide-react'
import { devicesApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'
import { DeviceStateMachine } from './device-state-machine'

interface MoveDeviceDialogProps {
    device: {
        id: string
        name: string
        status4D: string
        uHeight: number
        currentRackId: string
        currentUPosition: number
    }
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function MoveDeviceDialog({ device, open, onOpenChange, onSuccess }: MoveDeviceDialogProps) {
    const [targetRackId, setTargetRackId] = useState('')
    const [targetUPosition, setTargetUPosition] = useState<number>(1)
    const [targetPhase, setTargetPhase] = useState<'AS_IS' | 'TO_BE' | 'FUTURE'>('TO_BE')
    const [moveType, setMoveType] = useState<'MODIFIED' | 'CREATE_PROPOSED'>('MODIFIED')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleMove = async () => {
        if (!targetRackId || targetUPosition < 1) {
            setError('Please provide target rack and U-position')
            return
        }

        setLoading(true)
        setError(null)

        try {
            await devicesApi.moveDevice(device.id, targetRackId, targetUPosition, {
                targetPhase,
                moveType,
            })

            toast.success('Device moved successfully')
            onOpenChange(false)
            onSuccess?.()
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to move device'
            const conflicts = err.response?.data?.conflicts

            if (conflicts) {
                setError(`${errorMsg}\n\nConflicts:\n${conflicts.map((c: any) => `- ${c.deviceName} (U${c.uStart}-U${c.uEnd})`).join('\n')}`)
            } else {
                setError(errorMsg)
            }
            toast.error('Move failed')
        } finally {
            setLoading(false)
        }
    }

    const getTargetState = () => {
        if (moveType === 'MODIFIED') {
            return 'MODIFIED'
        } else {
            return 'EXISTING_REMOVED' // Current becomes removed, new copy will be PROPOSED
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Move Device: {device.name}</DialogTitle>
                    <DialogDescription>
                        Move device to a new rack and U-position. Choose how to handle the relocation.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Move Type Selection */}
                    <div className="space-y-3">
                        <Label>Move Strategy</Label>
                        <RadioGroup value={moveType} onValueChange={(v) => setMoveType(v as any)}>
                            <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="MODIFIED" id="modified" className="mt-1" />
                                <div className="flex-1">
                                    <label htmlFor="modified" className="font-medium flex items-center gap-2 cursor-pointer">
                                        <Move className="h-4 w-4" />
                                        Move (Single Device)
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Update this device's location. Status becomes <strong>MODIFIED</strong> until deployment.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                                <RadioGroupItem value="CREATE_PROPOSED" id="create-copy" className="mt-1" />
                                <div className="flex-1">
                                    <label htmlFor="create-copy" className="font-medium flex items-center gap-2 cursor-pointer">
                                        <Copy className="h-4 w-4" />
                                        Plan Relocation (Create Copy)
                                    </label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Create new <strong>PROPOSED</strong> device at target. Original marked <strong>EXISTING_REMOVED</strong>.
                                    </p>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Target Rack */}
                    <div className="space-y-2">
                        <Label htmlFor="target-rack">Target Rack ID</Label>
                        <Input
                            id="target-rack"
                            value={targetRackId}
                            onChange={(e) => setTargetRackId(e.target.value)}
                            placeholder="rack-uuid"
                        />
                    </div>

                    {/* Target U Position */}
                    <div className="space-y-2">
                        <Label htmlFor="target-u">Target U-Position</Label>
                        <Input
                            id="target-u"
                            type="number"
                            min={1}
                            max={42}
                            value={targetUPosition}
                            onChange={(e) => setTargetUPosition(parseInt(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Device height: {device.uHeight}U (will occupy U{targetUPosition}-U{targetUPosition + device.uHeight})
                        </p>
                    </div>

                    {/* Target Phase */}
                    <div className="space-y-2">
                        <Label htmlFor="target-phase">Target Phase</Label>
                        <Select value={targetPhase} onValueChange={(v) => setTargetPhase(v as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AS_IS">AS_IS (Current)</SelectItem>
                                <SelectItem value="TO_BE">TO_BE (Planned)</SelectItem>
                                <SelectItem value="FUTURE">FUTURE (Reserved)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* State Transition Preview */}
                    <div className="mt-4">
                        <DeviceStateMachine currentState={device.status4D} targetState={getTargetState()} compact />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleMove} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Move Device
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
