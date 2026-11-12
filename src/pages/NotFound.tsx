import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { Button, EmptyState } from '../components/ui'

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <EmptyState
        icon={<Home className="size-6" />}
        title="That page is not part of this home"
        description="The page you were looking for could not be found. Head back to the dashboard to keep going."
        action={
          <Link to="/">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  )
}
