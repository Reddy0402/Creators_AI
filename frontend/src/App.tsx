import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CampaignWorkspacePage } from './pages/CampaignWorkspacePage'
import { CreateCampaignPage } from './pages/CreateCampaignPage'
import { DashboardPage } from './pages/DashboardPage'

// A data router is required for the unsaved-changes guard (useBlocker).
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'campaigns/new', element: <CreateCampaignPage /> },
      { path: 'campaigns/:id', element: <CampaignWorkspacePage /> },
      { path: '*', element: <DashboardPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
