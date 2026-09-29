// ./src/enums/apiRoutes.ts
'use client'

export enum CampaignAPIRoutes {
    ADD = 'campaigns/add',
    ADD_BULK = 'campaigns/add-bulk',
    GET_ALL = 'campaigns',
    GET_BY_ID = 'campaigns/:id',
}

export enum NewsLettersAPIRoutes {
    ADD = 'newsletters',
    UPDATE = 'newsletters/:id',
    DELETE = 'newsletters/:id',
    GET_ALL = 'newsletters',
    GET_BY_ID = 'newsletters/:id',
}

export enum UpworkJobsAPIRoutes {
    GET_LATEST = 'upwork-job/latest',
    GET_SUBMITTED = 'upwork-job/add-submitted-upwork-jobs',
    ADD_SUBMITTED_JOB = 'upwork-job/add-submitted-upwork-jobs',
    GET_STATS = 'upwork-job/fetch-upwork-jobs-stats',

}

export enum LeadsAPIRoutes {
    ADD = 'leads/manual-add',
    ADD_BULK = 'leads/bulk-upload',
    GET_ALL = 'leads',
    DELETE_BULK = 'leads/bulk-delete',

}
export enum MainProfilesAPIRoutes {
    GET_ALL = 'main-profiles',
}

export enum DetailProfilesAPIRoutes {
    GET_ALL = 'detail-profiles',
    GET_BY_ID = 'detail-profiles/:id',
    CREATE = 'detail-profiles',
    UPDATE = 'detail-profiles/:id',
    GENERATE_PDF = 'detail-profiles/generatePRT',
    RESET_PDF_URL = 'detail-profiles/resetPDFURL',
    GENERATE_PROFILE = 'detail-profiles/generateProfile',
    MATCH_JOB = 'detail-profiles/match-job',
}

export enum AuthAPIRoutes {
    LOGIN = 'auth/login',
    LIST = 'auth/list',
    ADD = 'auth/add',
    UPDATE = 'auth/update/:id',
    DELETE = 'auth/delete/:id',
}

export enum CategoriesAPIRoutes {
    ADD = 'categories',
    ADD_BULK = 'categories/bulk',
    GET_ALL = 'categories',
    GET_BY_ID = 'categories/:id',
    UPDATE = 'categories/:id',
    DELETE = 'categories/:id',
    HARD_DELETE = 'categories/:id/hard',
}

export enum SkillGroupsAPIRoutes {
    ADD = 'dynamicGeneration',
    ADD_BULK = 'dynamicGeneration/bulk',
    GET_ALL = 'dynamicGeneration',
    GET_BY_ID = 'dynamicGeneration/:id',
    UPDATE = 'dynamicGeneration/:id',
    DELETE = 'dynamicGeneration/:id',
    HARD_DELETE = 'dynamicGeneration/:id/hard',
}

export enum FAQAPIRoutes {
    ADD = 'faq',
    GET_ALL = 'faq',
    UPDATE = 'faq/:id',
    DELETE = 'faq/:id',
}

export enum SkillsAPIRoutes {
    ADD = 'skills',
    ADD_BULK = 'skills/bulk',
    GET_ALL = 'skills',
    GET_BY_ID = 'skills/:id',
    UPDATE = 'skills/:id',
    DELETE = 'skills/:id',
    HARD_DELETE = 'skills/:id/hard',
    FIND_BY_DESCRIPTION = 'skills/find',
}

export enum PortfoliosAPIRoutes {
    GET_ALL = 'portfolios',
    GET_BY_ID = 'portfolios/:id',
    ADD = 'portfolios',
    UPDATE = 'portfolios/:id',
    DELETE = 'portfolios/:id',
    UPLOAD_SINGLE = 'portfolios/upload-single',
    UPLOAD_MULTIPLE = 'portfolios/upload-multiple',
}

export enum TestimonialsAPIRoutes {
    GET_ALL = 'testimonials',
    GET_BY_ID = 'testimonials/:id',
    ADD = 'testimonials',
    UPDATE = 'testimonials/:id',
    DELETE = 'testimonials/:id',
    UPLOAD_SINGLE = 'testimonials/upload-single',
}

export enum GmailGatewaysAPIRoutes {
    GET_ALL = 'gmail-gateways',
    CREATE = 'gmail-gateways',
    UPDATE = 'gmail-gateways/:id',
    DELETE = 'gmail-gateways/:id',
    GET_AUTH_URL = 'gmail-gateways/:id/auth-url',
    TEST = 'gmail-gateways/:id/test',
    SEND = 'gmail-gateways/:id/send',
    INBOX = 'gmail-gateways/:id/inbox',
}

export enum ClientsAPIRoutes {
    GET_ALL = 'clients',
    GET_BY_ID = 'clients/:id',
    CREATE = 'clients',
    UPDATE = 'clients/:id',
    DELETE = 'clients/:id',
    LOG_FOLLOWUP = 'clients/:id/log-followup',
}

export enum ReferralSettingsAPIRoutes {
    GET = 'referral-settings',
    UPSERT = 'referral-settings',
}

export enum GlobalSettingsAPIRoutes {
    GET = 'global-settings',
    SET_GMAIL_SCHEDULER = 'global-settings/gmail-scheduler',
}

export enum VerifaliaCredentialsAPIRoutes {
    GET_ALL = 'verifalia-credentials',
    CREATE = 'verifalia-credentials',
    UPDATE = 'verifalia-credentials/:id',
    DELETE = 'verifalia-credentials/:id',
    CHECK_BALANCE = 'verifalia-credentials/:id/check-balance',
}

export enum AiJobsAPIRoutes {
    GET_ALL = 'ai-jobs',
    GET_BY_ID = 'ai-jobs/:id',
    CREATE = 'ai-jobs',
    UPDATE = 'ai-jobs/:id',
    DELETE = 'ai-jobs/:id',
    IMPORT_MERCOR = 'ai-jobs/import/mercor',
    IMPORT_ALIGNER = 'ai-jobs/import/aligner',
    SYNC_MERCOR = 'ai-jobs/sync-mercor-referrals',
}

export enum AParseAPIRoutes {
    GET_WEEKS = 'aparse/weeks',
    CREATE_WEEK = 'aparse/weeks',
    UPDATE_WEEK = 'aparse/weeks/:id',
    DELETE_WEEK = 'aparse/weeks/:id',
    SET_CURRENT_WEEK = 'aparse/weeks/:id/current',
    GET_ASSIGNEES = 'aparse/assignees',
    GET_JOBS = 'aparse/jobs',
    CREATE_JOB = 'aparse/jobs',
    UPDATE_JOB = 'aparse/jobs/:id',
    DELETE_JOB = 'aparse/jobs/:id',
    RESTORE_JOB = 'aparse/jobs/:id/restore',
    GET_TURNS = 'aparse/jobs/:jobId/turns',
    CREATE_TURN = 'aparse/jobs/:jobId/turns',
    GET_TURN = 'aparse/turns/:id',
    UPDATE_TURN = 'aparse/turns/:id',
    DELETE_TURN = 'aparse/turns/:id',
    RESTORE_TURN = 'aparse/turns/:id/restore',
}

export enum DeckGradingAPIRoutes {
    GET_CONTRIBUTORS = 'deck-grading/contributors',
    CREATE_CONTRIBUTOR = 'deck-grading/contributors',
    UPDATE_CONTRIBUTOR = 'deck-grading/contributors/:id',
    GET_TASKS = 'deck-grading/tasks',
    CREATE_TASK = 'deck-grading/tasks',
    GET_TASK = 'deck-grading/tasks/:id',
    UPDATE_TASK = 'deck-grading/tasks/:id',
    DELETE_TASK = 'deck-grading/tasks/:id',
    ADD_TASK_MEDIA = 'deck-grading/tasks/:id/media',
    DELETE_TASK_MEDIA = 'deck-grading/tasks/:id/media/:mediaId',
    ADD_SECTION_MEDIA = 'deck-grading/tasks/:id/section-media/:key',
    DELETE_SECTION_MEDIA = 'deck-grading/tasks/:id/section-media/:key/:mediaId',
}

export enum AntonParserAPIRoutes {
    GET_TASKS = 'anton-parser/tasks',
    CREATE_TASK = 'anton-parser/tasks',
    GET_TASK = 'anton-parser/tasks/:id',
    UPDATE_TASK = 'anton-parser/tasks/:id',
    DELETE_TASK = 'anton-parser/tasks/:id',
    GET_ASSIGNEES = 'anton-parser/assignees',
}

export enum AnthropicParserAPIRoutes {
    GET_TASKS = 'anthropic-parser/tasks',
    CREATE_TASK = 'anthropic-parser/tasks',
    GET_TASK = 'anthropic-parser/tasks/:id',
    UPDATE_TASK = 'anthropic-parser/tasks/:id',
    DELETE_TASK = 'anthropic-parser/tasks/:id',
}

export enum ProfessionalsAPIRoutes {
    GET_ALL = 'professionals',
    GET_BY_ID = 'professionals/:id',
    CREATE = 'professionals',
    UPDATE = 'professionals/:id',
    DELETE = 'professionals/:id',
    ASSIGN_GATEWAY = 'professionals/assign-gateway',
    VERIFY_EMAIL = 'professionals/:id/verify-email',
}

export enum MatchedJobsAPIRoutes {
    SAVE_BATCH = 'matched-jobs/batch',
    GET_BY_PROFESSIONAL = 'matched-jobs',
    DELETE = 'matched-jobs/:id',
}

export enum EmailCampaignsAPIRoutes {
    SAVE_BATCH = 'email-campaigns/batch',
    QUEUE_BATCH = 'email-campaigns/queue-batch',
    REBALANCE_QUEUE = 'email-campaigns/rebalance-queue',
    GET_STATS = 'email-campaigns/stats',
    GET_ALL = 'email-campaigns/all',
    GET_BY_PROFESSIONAL = 'email-campaigns',
    UPDATE_STATUS = 'email-campaigns/:id/status',
    UPDATE_SCHEDULED_TIME = 'email-campaigns/:id/scheduled-time',
    CHECK_REPLIES = 'email-campaigns/check-replies',
}

export enum EmailNotificationsAPIRoutes {
    GET_ALL = 'email-notifications',
    GET_RECENT = 'email-notifications/recent',
    MARK_READ = 'email-notifications/mark-read',
}

export enum SponsoredCompaniesAPIRoutes {
    GET_ALL = 'sponsored-companies',
    GET_DISTINCT = 'sponsored-companies/distinct-values',
    GET_BY_ID = 'sponsored-companies/:id',
    CREATE = 'sponsored-companies',
    UPDATE = 'sponsored-companies/:id',
    DELETE = 'sponsored-companies/:id',
    UPSERT_JSON = 'sponsored-companies/upsert-json',
    RAW_QUERY = 'sponsored-companies/raw-query',
    MANUAL_CHECK = 'sponsored-companies/:id/manual-check',
    ASSIGN = 'sponsored-companies/assign',
}

export enum CompanyCategoriesAPIRoutes {
    GET_ALL = 'company-categories',
    CREATE = 'company-categories',
    UPDATE = 'company-categories/:id',
    DELETE = 'company-categories/:id',
}

export enum SponsoredJobsAPIRoutes {
    GET_ALL = 'sponsored-jobs',
    GET_DISTINCT = 'sponsored-jobs/distinct-values',
    UPSERT_FOR_COMPANY = 'sponsored-jobs/upsert-for-company/:companyId',
    UPDATE = 'sponsored-jobs/:id',
    ASSIGN = 'sponsored-jobs/assign',
}

export enum JobApplicantsAPIRoutes {
    GET_ALL = 'job-applicants',
    GET_BY_ID = 'job-applicants/:id',
    CREATE = 'job-applicants',
    UPDATE = 'job-applicants/:id',
    DELETE = 'job-applicants/:id',
}

export enum JobCVsAPIRoutes {
    GET_ALL = 'job-cvs',
    GET_BY_ID = 'job-cvs/:id',
    CREATE = 'job-cvs',
    UPDATE = 'job-cvs/:id',
    DELETE = 'job-cvs/:id',
    UPLOAD_AUDIO = 'job-cvs/upload-audio',
    GET_HISTORY = 'job-cvs/:id/history',
    ADD_HISTORY = 'job-cvs/:id/history',
}

export enum ShowErrorMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}
export enum ShowSuccessMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}