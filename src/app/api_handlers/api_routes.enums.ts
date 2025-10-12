// ./src/enums/apiRoutes.ts


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
    GET_LATEST = 'upwork-job/latest'
}

export enum LeadsAPIRoutes {
    ADD = 'leads/manual-add',
    ADD_BULK = 'leads/bulk-upload',
    GET_ALL = 'leads',
    DELETE_BULK = 'leads/bulk-delete',

}

export enum ShowErrorMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}
export enum ShowSuccessMessageOptionsRoutes {
    INCLUDE,
    EXCLUDE

}