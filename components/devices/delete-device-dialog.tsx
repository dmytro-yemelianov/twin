import React, { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Trash2, Info } from 'lucide-react'
import { devicesApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'
import { DeviceStateMachine } from './device-state-machine'

interface DeleteDeviceDialogProps {
    device: {
        id: string
        name: string
        status4D: string
    }
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function DeleteDeviceDialog({ device, open, onOpenChange, onSuccess }: DeleteDeviceDialogProps) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)

        try {
            await devicesApi.deleteDevice(device.id)
            toast.success('Device soft-deleted successfully')
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            console.error('Error deleting device:', error)
            toast.error('Failed to delete device')
        } finally {
            setLoading(false)
        }
    }

    const getTargetState = () => {
        return device.status4D === 'EXISTING_RETAINED' ? 'EXISTING_REMOVED' : device.status4D
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-destructive" />
                        Delete Device
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Are you sure you want to delete <strong>{device.name}</strong>?
                        </p>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                <strong>Soft Delete:</strong> Device will be hidden from views by setting{' '}
                                <code className="bg-muted px-1 py-0.5 rounded">isActive = false</code>.
                                This action is reversible and maintains full history.
                            </AlertDescription>
                        </Alert>

                        <div className="mt-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">State Change:</p>
                            <DeviceStateMachine currentState={device.status4D} targetState={getTargetState()} compact />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Device
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
