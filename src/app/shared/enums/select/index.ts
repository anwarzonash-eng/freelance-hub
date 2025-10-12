export const STATUS_ENUM = {
    ANY: "Any Status",
    PENDING: "Pending",
    NOT_INTERESTED: "Not Interested",
    IS_DELETE: "Deleted", // Using IS_DELETE for the internal filter value
    SHORT_LISTED: "Short Listed",
    EMAIL_SENT: "Email Sent",
};

/**
 * Lead Sources (Enum-like object)
 * Key: value used in the data and API filter
 * Value: Human-readable label
 */
export const SOURCE_ENUM = {
    ANY: "Any Source",
    UPWORK: "Upwork",
    WE_WORK_REMOTELY: "We Work Remotely",
};