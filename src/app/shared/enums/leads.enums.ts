export enum LeadSource {

    WE_WORK_REMOTELY = 'we_work_remotely',
    FLEX_JOBS = 'flex_jobs',
    UPWORK = 'upwork',
    STUDENT = 'student',
    BOUGHT_NEW_DOMAINS = "bought_new_domains",
    LINKEDIN = "linkedin",
    INDEED = 'indeed'
}

export enum EmailStatus {

    New = 'new',
    ShortListed = 'short_listed',
    EmailFetched = 'email_fetched',
    DataAttached = 'data_attached',
    WebsiteCreated = 'website_created',
    ShortLinksCreated = 'short_links_created',
    PdfAttached = 'pdf_attached',
    EmailSent = 'email_sent',
    WhatsappSent = 'whatsapp_sent',
}

export enum WhatsAppSMSStatus {

    New = 'new',
    ShortListed = 'short_listed',
    ContactFetched = 'contact_fetched',
    SMSSent = 'SMS_Sent',
    WhatsAppSent = 'WhatsApp_Sent',
}

export enum CampaignType {

    Both = 'both',
    Email = 'email',
    WhatsApp = 'whatsapp',
}

export enum SentStatus {
    ALL = 'all',
    PENDING = 'pending',
    Sent = 'sent',
    Failed = 'failed',
}