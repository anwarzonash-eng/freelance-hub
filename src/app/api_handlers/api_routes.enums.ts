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
    GENERATE_PDF = 'detail-profiles/generatePRT',
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
}

export enum ShowErrorMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}
export enum ShowSuccessMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}