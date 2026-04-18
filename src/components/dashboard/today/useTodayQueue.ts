'use client'
import { useState } from 'react'
import type { TodayItemData } from './today-queue-types'

export function useTodayQueue(initialItems: TodayItemData[]) {
  const [items, setItems] = useState(initialItems)

  function markComplete(id: string) {
    setItems(prev =>
      prev.map(item => item.id === id ? { ...item, completed: true } : item)
    )
  }

  return {
    items,
    markComplete,
    caughtUp: items.every(i => i.completed),
  }
}
