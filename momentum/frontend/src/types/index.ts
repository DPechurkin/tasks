export interface Idea {
  id: number
  title: string
  description: string | null
  order: number
  plansCount?: number
  plans?: Plan[]
  createdAt: string
  updatedAt: string
}

export interface Plan {
  id: number
  ideaId: number | null
  ideaTitle?: string | null
  title: string
  description: string | null
  order: number
  tasksCount?: number
  tasks?: Task[]
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'new' | 'in_progress' | 'done' | 'done_partially' | 'abandoned'

export interface Task {
  id: number
  planId: number
  planTitle?: string
  ideaId?: number | null
  ideaTitle?: string | null
  parentTaskId?: number | null
  parentTaskTitle?: string | null
  title: string
  description: string | null
  status: TaskStatus
  order: number
  slotsCount?: number
  commentsCount?: number
  subtasksCount?: number
  slots?: ScheduledSlot[]
  subtasks?: Task[]
  createdAt: string
  updatedAt: string
}

export interface ScheduledSlot {
  id: number
  taskId: number
  taskTitle?: string
  taskStatus?: TaskStatus
  planId?: number
  planTitle?: string
  date: string  // YYYY-MM-DD
  timeFrom: string  // HH:MM
  timeTo: string    // HH:MM
  comment: string | null
  recurrenceRuleId?: number | null
  createdAt: string
  updatedAt: string
}

export interface RecurringCreateData {
  taskId: number
  startDate: string
  timeFrom: string
  timeTo: string
  endDate: string
  type: 'weekly' | 'monthly' | 'yearly'
  daysOfWeek?: number[]
  daysOfMonth?: number[]
  month?: number
  day?: number
}

export interface DaySchedule {
  [date: string]: ScheduledSlot[]
}

export interface FeedDay {
  date: string
  slots: ScheduledSlot[]
}

export interface UpcomingNotification {
  id: number
  taskTitle: string
  planTitle: string
  date: string
  timeFrom: string
  timeTo: string
  minutesUntilStart: number
}
