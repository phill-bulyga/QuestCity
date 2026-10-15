import { lazy, Suspense } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '../auth/ProtectedRoute'

const HomePage = lazy(() =>
  import('../pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const DemoQuestRoute = lazy(() =>
  import('../pages/DemoQuestRoute').then((module) => ({ default: module.DemoQuestRoute })),
)
const AdminPage = lazy(() =>
  import('../pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)
const GamePage = lazy(() =>
  import('../pages/GamePage').then((module) => ({ default: module.GamePage })),
)
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const QuestBuilderPage = lazy(() =>
  import('../pages/QuestBuilderPage').then((module) => ({ default: module.QuestBuilderPage })),
)
const QuestCatalogPage = lazy(() =>
  import('../pages/QuestCatalogPage').then((module) => ({ default: module.QuestCatalogPage })),
)
const QuestCreatePage = lazy(() =>
  import('../pages/QuestCreatePage').then((module) => ({ default: module.QuestCreatePage })),
)
const QuestGeneratePage = lazy(() =>
  import('../pages/QuestGeneratePage').then((module) => ({ default: module.QuestGeneratePage })),
)
const QuestDetailPage = lazy(() =>
  import('../pages/QuestDetailPage').then((module) => ({ default: module.QuestDetailPage })),
)
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)

function PageLoader() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress aria-label="Загрузка страницы" />
    </Box>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/demo" element={<DemoQuestRoute />} />
          <Route path="/quests" element={<QuestCatalogPage />} />
          <Route path="/quests/new" element={<QuestCreatePage />} />
          <Route path="/quests/new/generate" element={<QuestGeneratePage />} />
          <Route path="/quests/:questId" element={<QuestDetailPage />} />
          <Route path="/quests/:questId/edit" element={<QuestBuilderPage />} />
          <Route path="/play/:sessionId" element={<GamePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
