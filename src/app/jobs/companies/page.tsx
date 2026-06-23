import { Suspense } from 'react'
import CompaniesPage from '@/app/components/jobs/CompaniesPage'

export default function CompaniesRoute() {
    return (
        <Suspense fallback={null}>
            <CompaniesPage />
        </Suspense>
    )
}
