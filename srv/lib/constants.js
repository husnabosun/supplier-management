const NAMESPACE = 'supplier.management';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const BCRYPT_SALT_ROUNDS = 10;
const MAX_CERTIFICATE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes
const PDF_MIME_TYPE = 'application/pdf';

const STATUS = Object.freeze({
    SUBMITTED: 'SUBMITTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
});

// companyName 
// contactPerson are permanently locked and can never be requested for revision
const ALLOWED_REVISION_FIELDS = ['phone', 'country', 'category', 'taxNumber', 'website', 'address', 'notes', 'certificate'];

const GEMINI_SERVICE_NAME = 'GEMINI_AI';
const GEMINI_GENERATE_PATH = '/v1beta/models/gemini-flash-latest:generateContent';
const GEMINI_TIMEOUT_MS = 30000;

module.exports = {
    NAMESPACE,
    PASSWORD_REGEX,
    BCRYPT_SALT_ROUNDS,
    MAX_CERTIFICATE_SIZE,
    PDF_MIME_TYPE,
    STATUS,
    ALLOWED_REVISION_FIELDS,
    GEMINI_SERVICE_NAME,
    GEMINI_GENERATE_PATH,
    GEMINI_TIMEOUT_MS
};
