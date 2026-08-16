'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Printer, RefreshCw } from 'lucide-react'
import { getCVById } from '@/app/api_handlers/api/job-cvs.api'
import CVPreview, { CVData } from '@/app/components/jobs/CVPreview'

export default function ViewCVPage() {
    const { id } = useParams()
    const [cv, setCV] = useState<any | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(false)

    const loadCV = useCallback((showFullLoader = false) => {
        if (!id) return
        if (showFullLoader) setLoading(true)
        else setRefreshing(true)
        getCVById(Number(id))
            .then((res: any) => {
                const data = res?.data ?? res
                if (!data?.id) { setError(true); return }
                setCV(data)
                if (data.cv_title) document.title = data.cv_title
            })
            .catch(() => setError(true))
            .finally(() => { setLoading(false); setRefreshing(false) })
    }, [id])

    useEffect(() => { loadCV(true) }, [loadCV])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen font-sans text-gray-400 text-sm">
                Loading CV…
            </div>
        )
    }

    if (error || !cv) {
        return (
            <div className="flex items-center justify-center h-screen font-sans text-gray-400 text-sm">
                CV not found.
            </div>
        )
    }

    const cvData: CVData = {
        applicant_name: cv.applicant_name,
        headline: cv.headline,
        location: cv.location,
        selected_email: cv.selected_email,
        selected_phone: cv.selected_phone,
        linkedin: cv.linkedin,
        github: cv.github,
        portfolios: cv.portfolios,
        summary: cv.summary,
        skills: cv.skills,
        core_skills: cv.core_skills,
        experience_items: cv.experience_items,
        education: cv.education,
        projects: cv.projects,
    }

    return (
        <>
            <div className="no-print fixed top-4 right-4 z-10 flex items-center gap-2">
                <span className="text-xs text-gray-500">{cv.applicant_name} — {cv.cv_title}</span>
                <button
                    onClick={() => loadCV()}
                    disabled={refreshing}
                    title="Reload latest saved version"
                    className="flex items-center justify-center w-8 h-8 border border-gray-300 bg-white text-gray-500 rounded hover:bg-gray-50 shadow-md disabled:opacity-50">
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 shadow-md">
                    <Printer size={13} />
                    Print / Save as PDF
                </button>
            </div>

            <div id="cv-content" style={{ maxWidth: '794px', margin: '0 auto' }}>
                <CVPreview data={cvData} fontSettings={cv.font_settings ?? undefined} theme={cv.theme ?? undefined} />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    * { -webkit-print-color-adjust: exact !important; }
                    body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    #cv-content { max-width: none !important; }
                }
                @page { margin: 15mm; }
            ` }} />
        </>
    )
}
