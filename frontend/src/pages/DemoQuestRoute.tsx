import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'

import { PageState } from '../components/PageState'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function DemoQuestRoute() {
  const { token } = useAuth()
  const query = useQuery({
    queryKey: ['quests', 'catalog'],
    queryFn: () => api.listQuests(token!),
    enabled: Boolean(token),
  })

  if (query.isLoading) return <PageState title="Демо-маршрут" loading />
  if (query.isError) return <PageState title="Демо недоступно" message="Не удалось загрузить демонстрационный квест. Попробуйте открыть маршрут из каталога." />
  const demoQuest = query.data?.find((quest) => quest.title === 'Таганрог: от Петра I до Чехова' && quest.city === 'Таганрог')
  if (!demoQuest) return <PageState title="Демо скоро появится" message="Демо-квест пока не опубликован. Другие маршруты можно найти в каталоге." />
  return <Navigate to={`/quests/${demoQuest.id}`} replace />
}
