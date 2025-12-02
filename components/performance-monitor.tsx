"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface PerformanceMetrics {
  fps: number
  memory: number
  renderTime: number
}

export function PerformanceMonitor({ show = false }: { show?: boolean }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: 0,
    renderTime: 0,
  })

  useEffect(() => {
    if (!show) return

    let frameCount = 0
    let lastTime = performance.now()
    let animationId: number

    const measureFPS = () => {
      const currentTime = performance.now()
      frameCount++

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        
        // Check if memory API is available
        const memory = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
          : 0

        setMetrics({
          fps,
          memory,
          renderTime: Math.round(currentTime - lastTime) / frameCount,
        })

        frameCount = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(measureFPS)
    }

    measureFPS()

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [show])

  if (!show || process.env.NODE_ENV !== 'development') return null

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50 opacity-90">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Performance Monitor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>FPS</span>
            <span className={metrics.fps < 30 ? "text-destructive" : metrics.fps < 50 ? "text-yellow-500" : "text-green-500"}>
              {metrics.fps}
            </span>
          </div>
          <Progress value={(metrics.fps / 60) * 100} className="h-1" />
        </div>
        
        {metrics.memory > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Memory</span>
              <span>{metrics.memory} MB</span>
            </div>
            <Progress value={Math.min((metrics.memory / 500) * 100, 100)} className="h-1" />
          </div>
        )}
        
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Render Time</span>
            <span>{metrics.renderTime.toFixed(2)} ms</span>
          </div>
          <Progress value={Math.min((metrics.renderTime / 16.67) * 100, 100)} className="h-1" />
        </div>
      </CardContent>
    </Card>
  )
}