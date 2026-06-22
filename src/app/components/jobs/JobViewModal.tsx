'use client'

import { useState } from 'react'
import { X, ChevronLeft, Edit2, ExternalLink } from 'lucide-react'
import { updateJob } from '@/app/api_handlers/api/sponsored-jobs.api'
import { JobPreview, JobEditForm } from './JobPreviewEdit'

interface Props {
    job: any
    onClose: () => void
    onJobSaved?: () => void
}

export default function JobViewModal({ job, onClose, onJobSaved }: Props) {
    const [stage, setStage] = useState<'preview' | 'edit'>('preview')
    const [editingJob, setEditingJob] = useState<any>(null)
    const [currentJob, setCurrentJob] = useState<any>(job)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleEditClick = () => {
        setEditingJob({ ...currentJob })
        setStage('edit')
    }

    const handleUpdateJob = async () => {
        if (!editingJob) return
        setSaving(true)
        setError(null)
        try {
            await updateJob(currentJob.id, editingJob)
            setCurrentJob({ ...editingJob })
            setStage('preview')
            setEditingJob(null)
            onJobSaved?.()
        } catch (err: any) {
            setError(err.message || 'Failed to save job')
        } finally {
            setSaving(false)
        }
    }

    const goBack = () => {
        if (stage === 'edit') {
            setStage('preview')
            setEditingJob(null)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white shadow-2xl w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
                    <div className="flex items-center gap-3">
                        {stage === 'edit' && (
                            <button onClick={goBack} className="text-gray-400 hover:text-gray-700">
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{stage === 'preview' ? 'View Job' : 'Edit Job'}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        {stage === 'preview' && currentJob.link && (
                            <a
                                href={currentJob.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0 whitespace-nowrap"
                            >
                                <ExternalLink size={12} />
                                View Job
                            </a>
                        )}
                        {stage === 'preview' && (
                            <button
                                onClick={handleEditClick}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                            >
                                <Edit2 size={12} />
                                Edit Job
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 ml-2"><X size={16} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                            <p className="text-xs text-red-700">{error}</p>
                        </div>
                    )}
                    {stage === 'preview' && (
                        <div className="space-y-4">
                            <JobPreview job={currentJob} />
                            <div className="border-t pt-4 flex gap-2">
                                <button
                                    onClick={handleEditClick}
                                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                                >
                                    <Edit2 size={12} /> Edit Job
                                </button>
                            </div>
                        </div>
                    )}

                    {stage === 'edit' && editingJob && (
                        <JobEditForm job={editingJob} setJob={setEditingJob} />
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                    >
                        Close
                    </button>
                    {stage === 'edit' && (
                        <button
                            type="button"
                            onClick={handleUpdateJob}
                            className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                            Done Editing
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
