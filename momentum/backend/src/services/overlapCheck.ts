import { db } from '../db/index.js'
import { scheduledSlots, tasks } from '../db/schema.js'
import { eq } from 'drizzle-orm'

interface SlotInput {
  date: string      // YYYY-MM-DD
  timeFrom: string  // HH:MM
  timeTo: string    // HH:MM
  excludeId?: number
}

export interface ConflictResult {
  id: number
  taskTitle: string
  timeFrom: string
  timeTo: string
}

export async function checkOverlap(input: SlotInput): Promise<ConflictResult | null> {
  const { date, timeFrom, timeTo, excludeId } = input

  // Получить все слоты этой даты
  const existingSlots = await db
    .select({
      id: scheduledSlots.id,
      timeFrom: scheduledSlots.timeFrom,
      timeTo: scheduledSlots.timeTo,
      taskTitle: tasks.title,
    })
    .from(scheduledSlots)
    .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
    .where(eq(scheduledSlots.date, date))

  for (const slot of existingSlots) {
    if (excludeId && slot.id === excludeId) continue
    // Пересечение: new_start < existing_end AND new_end > existing_start
    if (timeFrom < slot.timeTo && timeTo > slot.timeFrom) {
      return {
        id: slot.id,
        taskTitle: slot.taskTitle,
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo,
      }
    }
  }
  return null
}
