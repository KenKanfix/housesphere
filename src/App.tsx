import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ToastProvider } from './components/Toast'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Inventory = lazy(() => import('./pages/Inventory').then((module) => ({ default: module.Inventory })))
const Warranties = lazy(() => import('./pages/Warranties').then((module) => ({ default: module.Warranties })))
const Maintenance = lazy(() => import('./pages/Maintenance').then((module) => ({ default: module.Maintenance })))
const Projects = lazy(() => import('./pages/Projects').then((module) => ({ default: module.Projects })))
const Documents = lazy(() => import('./pages/Documents').then((module) => ({ default: module.Documents })))
const Expenses = lazy(() => import('./pages/Expenses').then((module) => ({ default: module.Expenses })))
const Bills = lazy(() => import('./pages/Bills').then((module) => ({ default: module.Bills })))
const Providers = lazy(() => import('./pages/Providers').then((module) => ({ default: module.Providers })))
const Assistant = lazy(() => import('./pages/Assistant').then((module) => ({ default: module.Assistant })))
const SettingsPage = lazy(() => import('./pages/Settings').then((module) => ({ default: module.SettingsPage })))
const More = lazy(() => import('./pages/More').then((module) => ({ default: module.More })))
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })))
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })))

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="warranties" element={<Warranties />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="projects" element={<Projects />} />
            <Route path="documents" element={<Documents />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="bills" element={<Bills />} />
            <Route path="providers" element={<Providers />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<About />} />
            <Route path="more" element={<More />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
